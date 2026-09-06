import { Router } from 'express';
import { authenticate, optionalAuthenticate, requireStaff } from '../middleware/auth';
import * as c from '../controllers/communityController';

const router = Router();

router.get('/feed', c.getFeed);
router.get('/leaderboard', c.getLeaderboard);
router.get('/totw', c.getTotw);
router.get('/users/:id', optionalAuthenticate, c.getPublicUser);
router.get('/forum', c.getForum);
router.get('/forum/:id', c.getForumPost);
router.get('/events', c.getEvents);
router.get('/templates/:templateId/comments', c.getComments);
router.get('/templates/:templateId/versions', c.getVersions);

router.post('/heartbeat', authenticate, c.postHeartbeat);
router.post('/users/:id/follow', authenticate, c.postFollow);
router.delete('/users/:id/follow', authenticate, c.deleteFollow);
router.post('/users/:id/endorse', authenticate, c.postEndorse);
router.post('/templates/:templateId/like', authenticate, c.postLike);
router.post('/templates/:templateId/comments', authenticate, c.postComment);
router.post('/templates/:templateId/weekly-vote', authenticate, c.postWeeklyVote);
router.post('/templates/:templateId/versions', authenticate, c.postVersion);
router.post('/forum', authenticate, c.postForum);
router.post('/forum/:id/replies', authenticate, c.postForumReply);
router.post('/replies/:replyId/helpful', authenticate, c.postHelpful);
router.post('/report', authenticate, c.postReport);
router.post('/events/:id/rsvp', authenticate, c.postRsvp);
router.post('/events/:id/enter', authenticate, c.postEnter);
router.get('/workspaces', authenticate, c.getWorkspaces);
router.post('/workspaces', authenticate, c.postWorkspace);
router.get('/workspaces/:id', authenticate, c.getWorkspace);
router.post('/workspaces/:id/invite', authenticate, c.postInvite);
router.post('/workspaces/:id/templates', authenticate, c.postAttach);
router.post('/digest/me', authenticate, c.postDigestMe);
router.post('/digest/run', authenticate, requireStaff('moderation'), c.postDigestRun);

export default router;
