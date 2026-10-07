import { createHash, randomBytes } from 'crypto';
import { prisma } from '../config/database';
import { webBaseUrl } from '../config/urls';
import { sendMail } from './mailer';
import { passwordResetEmail } from './emailTemplates';

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
// Stops anyone from flooding a mailbox by hammering "Forgot password".
const RESEND_COOLDOWN_MS = 60 * 1000;

export function hashResetToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// Creates a fresh single-use reset link (invalidating any older one) and
// emails it. Used by POST /api/auth/forgot-password and the admin
// "send password reset" action.
export async function issuePasswordReset(user: {
  id: string;
  email: string;
  name: string | null;
}): Promise<'sent' | 'throttled' | 'failed'> {
  const recent = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: null, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
    select: { id: true },
  });
  if (recent) return 'throttled';

  const raw = randomBytes(32).toString('hex');
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashResetToken(raw), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    }),
  ]);

  const link = `${webBaseUrl()}/reset-password?token=${raw}`;
  const sent = await sendMail(user.email, passwordResetEmail(user, link));
  return sent ? 'sent' : 'failed';
}
