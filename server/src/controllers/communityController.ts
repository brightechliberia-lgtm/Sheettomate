import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../utils/http';
import * as community from '../services/communityService';

const text = z.string().trim().min(2).max(4000);

export async function getFeed(_req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await community.feed());
  } catch (error) {
    next(error);
  }
}

export async function getLeaderboard(_req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await community.leaderboard());
  } catch (error) {
    next(error);
  }
}

export async function getTotw(_req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await community.templateOfTheWeek());
  } catch (error) {
    next(error);
  }
}

export async function getPublicUser(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await community.publicProfile(String(req.params.id), req.user?.sub));
  } catch (error) {
    next(error);
  }
}

export async function postHeartbeat(req: Request, res: Response, next: NextFunction) {
  try {
    const learn = Boolean(req.body?.learn);
    return sendSuccess(res, await community.heartbeat(req.user!.sub, learn));
  } catch (error) {
    next(error);
  }
}

export async function postFollow(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await community.followUser(req.user!.sub, String(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function deleteFollow(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await community.unfollowUser(req.user!.sub, String(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function postEndorse(req: Request, res: Response, next: NextFunction) {
  try {
    const skill = z.string().trim().min(2).max(40).parse(req.body.skill);
    return sendSuccess(res, await community.endorse(req.user!.sub, String(req.params.id), skill), 201);
  } catch (error) {
    next(error);
  }
}

export async function postLike(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await community.toggleLike(req.user!.sub, String(req.params.templateId)));
  } catch (error) {
    next(error);
  }
}

export async function getComments(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, { items: await community.listComments(String(req.params.templateId)) });
  } catch (error) {
    next(error);
  }
}

export async function postComment(req: Request, res: Response, next: NextFunction) {
  try {
    const body = text.parse(req.body.body);
    const parentId = typeof req.body.parentId === 'string' ? req.body.parentId : undefined;
    return sendSuccess(res, { comment: await community.addComment(req.user!.sub, String(req.params.templateId), body, parentId) }, 201);
  } catch (error) {
    next(error);
  }
}

export async function postWeeklyVote(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await community.voteWeekly(req.user!.sub, String(req.params.templateId)));
  } catch (error) {
    next(error);
  }
}

export async function getForum(_req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, { items: await community.listForum() });
  } catch (error) {
    next(error);
  }
}

export async function getForumPost(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, { post: await community.getForumPost(String(req.params.id)) });
  } catch (error) {
    next(error);
  }
}

export async function postForum(req: Request, res: Response, next: NextFunction) {
  try {
    const title = z.string().trim().min(4).max(160).parse(req.body.title);
    const body = text.parse(req.body.body);
    const tags = z.array(z.string()).optional().parse(req.body.tags) ?? [];
    return sendSuccess(res, { post: await community.createForumPost(req.user!.sub, title, body, tags) }, 201);
  } catch (error) {
    next(error);
  }
}

export async function postForumReply(req: Request, res: Response, next: NextFunction) {
  try {
    const body = text.parse(req.body.body);
    const parentId = typeof req.body.parentId === 'string' ? req.body.parentId : undefined;
    return sendSuccess(res, { reply: await community.replyForum(req.user!.sub, String(req.params.id), body, parentId) }, 201);
  } catch (error) {
    next(error);
  }
}

export async function postHelpful(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await community.voteHelpful(req.user!.sub, String(req.params.replyId)));
  } catch (error) {
    next(error);
  }
}

export async function postReport(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z
      .object({ targetType: z.string().min(2), targetId: z.string().min(1), reason: z.string().min(4).max(500) })
      .parse(req.body);
    return sendSuccess(res, { flag: await community.report(req.user!.sub, body.targetType, body.targetId, body.reason) }, 201);
  } catch (error) {
    next(error);
  }
}

export async function getEvents(_req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, { items: await community.listEvents() });
  } catch (error) {
    next(error);
  }
}

export async function postRsvp(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await community.rsvpEvent(req.user!.sub, String(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function postEnter(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(
      res,
      await community.enterChallenge(req.user!.sub, String(req.params.id), req.body.templateId, req.body.notes),
    );
  } catch (error) {
    next(error);
  }
}

export async function getWorkspaces(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, { items: await community.listWorkspaces(req.user!.sub) });
  } catch (error) {
    next(error);
  }
}

export async function postWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const name = z.string().trim().min(2).max(80).parse(req.body.name);
    return sendSuccess(res, { workspace: await community.createWorkspace(req.user!.sub, name) }, 201);
  } catch (error) {
    next(error);
  }
}

export async function getWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, { workspace: await community.getWorkspace(String(req.params.id), req.user!.sub) });
  } catch (error) {
    next(error);
  }
}

export async function postInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const email = z.string().email().parse(req.body.email);
    return sendSuccess(res, await community.inviteToWorkspace(String(req.params.id), req.user!.sub, email));
  } catch (error) {
    next(error);
  }
}

export async function postAttach(req: Request, res: Response, next: NextFunction) {
  try {
    const templateId = z.string().min(1).parse(req.body.templateId);
    return sendSuccess(res, await community.attachTemplate(String(req.params.id), req.user!.sub, templateId));
  } catch (error) {
    next(error);
  }
}

export async function getVersions(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, { items: await community.listVersions(String(req.params.templateId)) });
  } catch (error) {
    next(error);
  }
}

export async function postVersion(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({ version: z.string().min(1).max(20), note: z.string().max(400).optional(), fileUrl: z.string().min(1) }).parse(req.body);
    return sendSuccess(res, { version: await community.addVersion(req.user!.sub, String(req.params.templateId), body.version, body.note, body.fileUrl) }, 201);
  } catch (error) {
    next(error);
  }
}

export async function postDigestMe(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await community.sendMyDigest(req.user!.sub));
  } catch (error) {
    next(error);
  }
}

export async function postDigestRun(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await community.runDigests());
  } catch (error) {
    next(error);
  }
}
