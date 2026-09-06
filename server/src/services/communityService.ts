import { prisma } from '../config/prisma';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { notify } from './notificationService';
import { sendCourseEmail } from './emailService';
import { publish, publishToUser } from '../realtime';
import { env } from '../config/env';

export const BADGES = {
  FIRST_TEMPLATE: 'First Template',
  TOP_CREATOR: 'Top Creator',
  COMMUNITY_HELPER: 'Community Helper',
} as const;

export function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function dayStamp(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function nextDay(iso: string) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function logActivity(userId: string, type: string, body: string, link?: string) {
  const row = await prisma.activity.create({ data: { userId, type, body, link } });
  publish('community', { type: 'activity', item: row });
  return row;
}

export async function bumpReputation(userId: string, delta: number) {
  await prisma.user.update({ where: { id: userId }, data: { reputation: { increment: delta } } });
}

export async function awardBadge(userId: string, badge: string) {
  await prisma.userBadge.upsert({
    where: { userId_badge: { userId, badge } },
    create: { userId, badge },
    update: {},
  });
}

export async function maybeTopCreator(userId: string) {
  const count = await prisma.template.count({ where: { createdById: userId, published: true } });
  if (count >= 3) await awardBadge(userId, BADGES.TOP_CREATOR);
}

export async function heartbeat(userId: string, learn = false) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  const today = dayStamp();
  let loginStreak = user.loginStreak;
  const lastSeen = user.lastSeenOn ? user.lastSeenOn.toISOString().slice(0, 10) : null;
  if (lastSeen !== today) {
    loginStreak = lastSeen && nextDay(lastSeen) === today ? user.loginStreak + 1 : 1;
  }
  let learnStreak = user.learnStreak;
  let lastLearnOn = user.lastLearnOn;
  if (learn) {
    const lastLearn = user.lastLearnOn ? user.lastLearnOn.toISOString().slice(0, 10) : null;
    if (lastLearn !== today) {
      learnStreak = lastLearn && nextDay(lastLearn) === today ? user.learnStreak + 1 : 1;
      lastLearnOn = new Date();
    }
  }
  return prisma.user.update({
    where: { id: userId },
    data: { lastSeenOn: new Date(), loginStreak, learnStreak, lastLearnOn },
    select: { loginStreak: true, learnStreak: true, reputation: true },
  });
}

export async function publicProfile(id: string, viewerId?: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      country: true,
      bio: true,
      expertise: true,
      reputation: true,
      loginStreak: true,
      learnStreak: true,
      role: true,
      templates: {
        where: { published: true, flagged: false },
        select: { id: true, title: true, category: true, previewUrl: true, averageRating: true },
        take: 12,
        orderBy: { createdAt: 'desc' },
      },
      badges: true,
      endorsementsRecv: { select: { skill: true, from: { select: { id: true, name: true } } } },
      certificates: { select: { id: true, code: true, course: { select: { title: true } }, issuedAt: true } },
      _count: { select: { followers: true, following: true, templates: true } },
    },
  });
  if (!user) throw new NotFoundError('User not found');
  const following = viewerId
    ? Boolean(await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: id } } }))
    : false;
  const activity = await prisma.activity.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 20 });
  return { user, following, activity };
}

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) throw new ConflictError('Cannot follow yourself');
  await prisma.follow.create({ data: { followerId, followingId } }).catch(() => {
    throw new ConflictError('Already following');
  });
  await bumpReputation(followingId, 1);
  await notify(followingId, 'FOLLOW', 'New follower', 'Someone started following you', `/u/${followerId}`);
  await logActivity(followerId, 'FOLLOW', 'followed a creator', `/u/${followingId}`);
  publishToUser(followingId, { type: 'follow', followerId });
  return { following: true };
}

export async function unfollowUser(followerId: string, followingId: string) {
  await prisma.follow.deleteMany({ where: { followerId, followingId } });
  return { following: false };
}

export async function toggleLike(userId: string, templateId: string) {
  const existing = await prisma.templateLike.findUnique({ where: { userId_templateId: { userId, templateId } } });
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) throw new NotFoundError();
  if (existing) {
    await prisma.templateLike.delete({ where: { userId_templateId: { userId, templateId } } });
  } else {
    await prisma.templateLike.create({ data: { userId, templateId } });
    await bumpReputation(template.createdById, 1);
    await notify(template.createdById, 'LIKE', 'Template liked', template.title, `/templates/${templateId}`);
    await logActivity(userId, 'LIKE', `liked ${template.title}`, `/templates/${templateId}`);
  }
  const likeCount = await prisma.templateLike.count({ where: { templateId } });
  publish(`template:${templateId}`, { type: 'like', templateId, likeCount, liked: !existing });
  return { liked: !existing, likeCount };
}

export async function listComments(templateId: string) {
  return prisma.templateComment.findMany({
    where: { templateId, parentId: null },
    include: {
      user: { select: { id: true, name: true } },
      replies: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
    take: 80,
  });
}

export async function addComment(userId: string, templateId: string, body: string, parentId?: string) {
  const comment = await prisma.templateComment.create({
    data: { userId, templateId, body, parentId },
    include: { user: { select: { id: true, name: true } } },
  });
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (template) {
    await notify(template.createdById, 'COMMENT', 'New comment', body.slice(0, 80), `/templates/${templateId}`);
  }
  publish(`template:${templateId}`, { type: 'comment', comment });
  return comment;
}

export async function endorse(fromUserId: string, toUserId: string, skill: string) {
  if (fromUserId === toUserId) throw new ConflictError('Endorse someone else');
  await prisma.endorsement.create({ data: { fromUserId, toUserId, skill: skill.trim().slice(0, 40) } }).catch(() => {
    throw new ConflictError('Already endorsed');
  });
  await bumpReputation(toUserId, 2);
  await notify(toUserId, 'ENDORSE', 'Skill endorsement', skill, `/u/${toUserId}`);
  return { endorsed: true };
}

export async function voteWeekly(userId: string, templateId: string) {
  const weekKey = isoWeek();
  await prisma.weeklyVote.upsert({
    where: { weekKey_userId: { weekKey, userId } },
    create: { weekKey, userId, templateId },
    update: { templateId },
  });
  return templateOfTheWeek();
}

export async function templateOfTheWeek() {
  const weekKey = isoWeek();
  const grouped = await prisma.weeklyVote.groupBy({
    by: ['templateId'],
    where: { weekKey },
    _count: { _all: true },
  });
  grouped.sort((a, b) => b._count._all - a._count._all);
  const top = grouped.slice(0, 5);
  const ids = top.map((g) => g.templateId);
  const templates = await prisma.template.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, previewUrl: true, category: true, createdBy: { select: { id: true, name: true } } },
  });
  return {
    weekKey,
    items: top.map((g) => ({
      votes: g._count._all,
      template: templates.find((t) => t.id === g.templateId),
    })),
  };
}

export async function feed() {
  const [activities, totw, showcase] = await Promise.all([
    prisma.activity.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    }),
    templateOfTheWeek(),
    prisma.template.findMany({
      where: { published: true, flagged: false },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, title: true, category: true, previewUrl: true, createdBy: { select: { id: true, name: true } } },
    }),
  ]);
  return { activities, totw, showcase };
}

export async function leaderboard() {
  const creators = await prisma.user.findMany({
    orderBy: { reputation: 'desc' },
    take: 15,
    select: { id: true, name: true, reputation: true, role: true, _count: { select: { templates: true, followers: true } } },
  });
  const helpers = await prisma.forumVote.groupBy({
    by: ['replyId'],
    _count: { _all: true },
  });
  const replyIds = helpers.sort((a, b) => b._count._all - a._count._all).slice(0, 40).map((h) => h.replyId);
  const replies = await prisma.forumReply.findMany({
    where: { id: { in: replyIds } },
    select: { id: true, userId: true, user: { select: { id: true, name: true } } },
  });
  const helperMap = new Map<string, { id: string; name: string; helpful: number }>();
  for (const r of replies) {
    const votes = helpers.find((h) => h.replyId === r.id)?._count._all ?? 0;
    const cur = helperMap.get(r.userId) ?? { id: r.user.id, name: r.user.name, helpful: 0 };
    cur.helpful += votes;
    helperMap.set(r.userId, cur);
  }
  const mostHelpful = [...helperMap.values()].sort((a, b) => b.helpful - a.helpful).slice(0, 10);
  return { creators, mostHelpful };
}

export async function listForum() {
  return prisma.forumPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 40,
    include: { user: { select: { id: true, name: true } }, _count: { select: { replies: true } } },
  });
}

export async function getForumPost(id: string) {
  const post = await prisma.forumPost.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      replies: {
        where: { parentId: null },
        include: {
          user: { select: { id: true, name: true } },
          votes: true,
          replies: { include: { user: { select: { id: true, name: true } }, votes: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!post) throw new NotFoundError();
  return post;
}

export async function createForumPost(userId: string, title: string, body: string, tags: string[]) {
  const post = await prisma.forumPost.create({ data: { userId, title, body, tags } });
  await logActivity(userId, 'FORUM', title, `/community/forum/${post.id}`);
  publish('community', { type: 'forum', postId: post.id });
  return post;
}

export async function replyForum(userId: string, postId: string, body: string, parentId?: string) {
  const reply = await prisma.forumReply.create({
    data: { userId, postId, body, parentId },
    include: { user: { select: { id: true, name: true } } },
  });
  const post = await prisma.forumPost.findUnique({ where: { id: postId } });
  if (post && post.userId !== userId) {
    await notify(post.userId, 'FORUM', 'New reply', body.slice(0, 80), `/community/forum/${postId}`);
  }
  return reply;
}

export async function voteHelpful(userId: string, replyId: string) {
  await prisma.forumVote.create({ data: { userId, replyId } }).catch(() => {
    throw new ConflictError('Already marked helpful');
  });
  const reply = await prisma.forumReply.findUnique({ where: { id: replyId } });
  if (reply) {
    await bumpReputation(reply.userId, 5);
    const count = await prisma.forumVote.count({ where: { reply: { userId: reply.userId } } });
    if (count >= 5) await awardBadge(reply.userId, BADGES.COMMUNITY_HELPER);
  }
  return { helpful: true };
}

export async function report(reporterId: string, targetType: string, targetId: string, reason: string) {
  const flag = await prisma.contentFlag.create({ data: { reporterId, targetType, targetId, reason } });
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  await Promise.all(admins.map((a) => notify(a.id, 'MODERATION', 'Content reported', reason, '/admin/moderation')));
  return flag;
}

export async function listEvents() {
  return prisma.communityEvent.findMany({
    orderBy: { startsAt: 'asc' },
    include: { _count: { select: { entries: true, rsvps: true } } },
  });
}

export async function rsvpEvent(userId: string, eventId: string) {
  await prisma.eventRsvp.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId },
    update: {},
  });
  return { rsvp: true };
}

export async function enterChallenge(userId: string, eventId: string, templateId?: string, notes?: string) {
  await prisma.challengeEntry.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId, templateId, notes },
    update: { templateId, notes },
  });
  return { entered: true };
}

export async function listWorkspaces(userId: string) {
  return prisma.workspace.findMany({
    where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    include: { owner: { select: { name: true } }, _count: { select: { members: true, templates: true } } },
  });
}

export async function createWorkspace(userId: string, name: string) {
  const ws = await prisma.workspace.create({
    data: {
      name,
      ownerId: userId,
      members: { create: { userId, role: 'OWNER' } },
    },
  });
  return ws;
}

async function assertMember(workspaceId: string, userId: string) {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { members: true },
  });
  if (!ws) throw new NotFoundError();
  if (ws.ownerId !== userId && !ws.members.some((m) => m.userId === userId)) throw new ForbiddenError();
  return ws;
}

export async function getWorkspace(id: string, userId: string) {
  await assertMember(id, userId);
  return prisma.workspace.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      templates: { include: { template: { select: { id: true, title: true, version: true } } } },
    },
  });
}

export async function inviteToWorkspace(workspaceId: string, actorId: string, email: string) {
  const ws = await assertMember(workspaceId, actorId);
  if (ws.ownerId !== actorId) throw new ForbiddenError('Only the owner can invite');
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new NotFoundError('No account with that email');
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    create: { workspaceId, userId: user.id, role: 'EDITOR' },
    update: {},
  });
  await notify(user.id, 'WORKSPACE', `Invited to ${ws.name}`, 'You can co-create templates in this workspace.', `/community/workspaces/${workspaceId}`);
  return { invited: true };
}

export async function attachTemplate(workspaceId: string, userId: string, templateId: string) {
  await assertMember(workspaceId, userId);
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) throw new NotFoundError();
  if (template.createdById !== userId && template.createdById !== (await prisma.workspace.findUnique({ where: { id: workspaceId } }))?.ownerId) {
    const memberOk = true;
    void memberOk;
  }
  await prisma.workspaceTemplate.upsert({
    where: { workspaceId_templateId: { workspaceId, templateId } },
    create: { workspaceId, templateId },
    update: {},
  });
  return { attached: true };
}

export async function listVersions(templateId: string) {
  return prisma.templateVersion.findMany({
    where: { templateId },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true } } },
  });
}

export async function addVersion(userId: string, templateId: string, version: string, note: string | undefined, fileUrl: string) {
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) throw new NotFoundError();
  const collab = await prisma.workspaceTemplate.findFirst({
    where: { templateId, workspace: { members: { some: { userId } } } },
  });
  if (template.createdById !== userId && !collab) throw new ForbiddenError();
  const row = await prisma.templateVersion.create({ data: { templateId, createdById: userId, version, note, fileUrl } });
  await prisma.template.update({ where: { id: templateId }, data: { version, fileUrl } });
  await logActivity(userId, 'VERSION', `v${version} on ${template.title}`, `/templates/${templateId}`);
  return row;
}

export async function sendMyDigest(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.digestOptIn) return { sent: false };
  const notes = await prisma.notification.findMany({
    where: { userId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    orderBy: { createdAt: 'desc' },
    take: 12,
  });
  const html = notes.map((n) => `<li>${n.title}: ${n.body}</li>`).join('') || '<li>No new community activity this week.</li>';
  await sendCourseEmail(
    user.email,
    'Your Sheettomate community digest',
    'Community digest',
    `<ul>${html}</ul><p><a href="${env.clientOrigin}/community">Open community</a></p>`,
    '/community',
  );
  return { sent: true, count: notes.length };
}

export async function runDigests() {
  const users = await prisma.user.findMany({ where: { digestOptIn: true }, select: { id: true }, take: 200 });
  let sent = 0;
  for (const u of users) {
    const r = await sendMyDigest(u.id);
    if (r.sent) sent += 1;
  }
  return { sent };
}
