CREATE TYPE "StaffRole" AS ENUM ('SUPER', 'CONTENT', 'COMMUNITY', 'FINANCE');
CREATE TYPE "TemplateReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "FlagStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

ALTER TABLE "users" ADD COLUMN "staff_role" "StaffRole";
ALTER TABLE "users" ADD COLUMN "suspended_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMP(3);
UPDATE "users" SET "staff_role" = 'SUPER' WHERE "role" = 'ADMIN';

ALTER TABLE "templates" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "templates" ADD COLUMN "review_status" "TemplateReviewStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "templates" ADD COLUMN "flagged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "templates" ADD COLUMN "flag_reason" TEXT;
CREATE INDEX "templates_featured_idx" ON "templates"("featured");
CREATE INDEX "templates_review_status_idx" ON "templates"("review_status");

CREATE TABLE "content_flags" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "FlagStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_flags_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "content_flags_status_idx" ON "content_flags"("status");
CREATE INDEX "content_flags_target_type_target_id_idx" ON "content_flags"("target_type", "target_id");
ALTER TABLE "content_flags" ADD CONSTRAINT "content_flags_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cms_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "author_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cms_pages_slug_key" ON "cms_pages"("slug");
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "error_events" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "error_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "error_events_created_at_idx" ON "error_events"("created_at");
