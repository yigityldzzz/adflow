import { prisma } from '../config/database';

// A user belongs to at most one organization. This resolves the full set of
// user ids that should be treated as "my team" for resource visibility —
// i.e. everyone in the same organization, or just the user themselves if
// they aren't in one. Call this instead of hardcoding `userId: req.user.id`
// in resource list/get/update/delete queries so teammates can see and
// manage each other's campaigns/links/etc.
export async function getTeamUserIds(userId: string): Promise<string[]> {
  const membership = await prisma.organizationMember.findUnique({
    where: { userId },
    select: { organizationId: true },
  });

  if (!membership) return [userId];

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: membership.organizationId },
    select: { userId: true },
  });

  return members.map((m) => m.userId);
}
