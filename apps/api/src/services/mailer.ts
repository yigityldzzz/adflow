import nodemailer, { Transporter } from 'nodemailer';

// Outgoing mail goes through an authenticated SMTP account (currently the
// Google Workspace mailbox info@digitaladexpert.de with an app password).
// When SMTP_* isn't configured (e.g. the demo instance) sending is skipped
// instead of failing the request that triggered it.
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export interface MailContent {
  subject: string;
  html: string;
  text: string;
}

// Never throws: callers (signup, password reset) must not fail because mail
// is down. Returns whether the message was handed to the SMTP server.
export async function sendMail(to: string, content: MailContent): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] SMTP not configured, skipped:', content.subject);
    return false;
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    return true;
  } catch (err) {
    console.error('[mailer] send failed:', content.subject, err instanceof Error ? err.message : err);
    return false;
  }
}
