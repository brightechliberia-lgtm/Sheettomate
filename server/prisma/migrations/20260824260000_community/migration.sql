-- Community, collaboration, events, reputation
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "expertise" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reputation" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "login_streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "learn_streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_seen_on" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_learn_on" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "digest_opt_in" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "follows" (
  "follower_id" TEXT NOT NULL,
  "following_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id","following_id")
);
CREATE INDEX IF NOT EXISTS "follows_following_id_idx" ON "follows"("following_id");
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "template_likes" (
  "user_id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "template_likes_pkey" PRIMARY KEY ("user_id","template_id")
);
CREATE INDEX IF NOT EXISTS "template_likes_template_id_idx" ON "template_likes"("template_id");
ALTER TABLE "template_likes" ADD CONSTRAINT "template_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_likes" ADD CONSTRAINT "template_likes_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "template_comments" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "parent_id" TEXT,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "template_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "template_comments_template_id_idx" ON "template_comments"("template_id");
ALTER TABLE "template_comments" ADD CONSTRAINT "template_comments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_comments" ADD CONSTRAINT "template_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_comments" ADD CONSTRAINT "template_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "template_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "endorsements" (
  "from_user_id" TEXT NOT NULL,
  "to_user_id" TEXT NOT NULL,
  "skill" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "endorsements_pkey" PRIMARY KEY ("from_user_id","to_user_id","skill")
);
CREATE INDEX IF NOT EXISTS "endorsements_to_user_id_idx" ON "endorsements"("to_user_id");
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "user_badges" (
  "user_id" TEXT NOT NULL,
  "badge" TEXT NOT NULL,
  "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id","badge")
);
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "activities" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "link" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "activities_created_at_idx" ON "activities"("created_at");
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "forum_posts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "forum_posts_created_at_idx" ON "forum_posts"("created_at");
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "forum_replies" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "parent_id" TEXT,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forum_replies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "forum_replies_post_id_idx" ON "forum_replies"("post_id");
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "forum_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "forum_votes" (
  "user_id" TEXT NOT NULL,
  "reply_id" TEXT NOT NULL,
  CONSTRAINT "forum_votes_pkey" PRIMARY KEY ("user_id","reply_id")
);
ALTER TABLE "forum_votes" ADD CONSTRAINT "forum_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forum_votes" ADD CONSTRAINT "forum_votes_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "forum_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "weekly_votes" (
  "week_key" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  CONSTRAINT "weekly_votes_pkey" PRIMARY KEY ("week_key","user_id")
);
CREATE INDEX IF NOT EXISTS "weekly_votes_week_key_template_id_idx" ON "weekly_votes"("week_key","template_id");
ALTER TABLE "weekly_votes" ADD CONSTRAINT "weekly_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "weekly_votes" ADD CONSTRAINT "weekly_votes_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "community_events" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "meeting_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "challenge_entries" (
  "event_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "template_id" TEXT,
  "notes" TEXT,
  CONSTRAINT "challenge_entries_pkey" PRIMARY KEY ("event_id","user_id")
);
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "community_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "event_rsvps" (
  "event_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  CONSTRAINT "event_rsvps_pkey" PRIMARY KEY ("event_id","user_id")
);
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "community_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "workspace_members" (
  "workspace_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'EDITOR',
  CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("workspace_id","user_id")
);
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "workspace_templates" (
  "workspace_id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  CONSTRAINT "workspace_templates_pkey" PRIMARY KEY ("workspace_id","template_id")
);
ALTER TABLE "workspace_templates" ADD CONSTRAINT "workspace_templates_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_templates" ADD CONSTRAINT "workspace_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "template_versions" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "created_by" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "note" TEXT,
  "file_url" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "template_versions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "template_versions_template_id_idx" ON "template_versions"("template_id");
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
