CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'TEXT', 'QUIZ', 'PRACTICE', 'PROJECT');

ALTER TABLE "courses" ADD COLUMN "slug" TEXT;
ALTER TABLE "courses" ADD COLUMN "thumbnail_url" TEXT;
ALTER TABLE "courses" ADD COLUMN "objectives" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "courses" ADD COLUMN "prerequisites" TEXT NOT NULL DEFAULT '';
ALTER TABLE "courses" ADD COLUMN "status" "CourseStatus" NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "courses" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "courses" ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "courses" ADD COLUMN "promo_percent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "courses" ADD COLUMN "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "courses" ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0;

UPDATE "courses" SET "slug" = "id" WHERE "slug" IS NULL;
ALTER TABLE "courses" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");
CREATE INDEX "courses_status_idx" ON "courses"("status");
CREATE INDEX "courses_featured_idx" ON "courses"("featured");

ALTER TABLE "course_enrollments" ADD COLUMN "last_lesson_id" TEXT;
ALTER TABLE "course_enrollments" ADD COLUMN "completed_at" TIMESTAMP(3);
ALTER TABLE "course_enrollments" ADD COLUMN "reminder_sent_at" TIMESTAMP(3);

ALTER TABLE "payment_items" ADD COLUMN "course_id" TEXT;
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "type" "LessonType" NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "video_url" TEXT,
    "video_provider" TEXT,
    "duration_sec" INTEGER NOT NULL DEFAULT 0,
    "quiz" JSONB,
    "practice_template_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lessons_course_id_sort_order_idx" ON "lessons"("course_id", "sort_order");
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "lesson_resources" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'file',
    CONSTRAINT "lesson_resources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "lesson_resources_lesson_id_idx" ON "lesson_resources"("lesson_id");
ALTER TABLE "lesson_resources" ADD CONSTRAINT "lesson_resources_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "position_sec" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "quiz_score" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lesson_progress_user_id_lesson_id_key" ON "lesson_progress"("user_id", "lesson_id");
CREATE INDEX "lesson_progress_lesson_id_idx" ON "lesson_progress"("lesson_id");
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "lesson_bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_bookmarks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lesson_bookmarks_user_id_lesson_id_key" ON "lesson_bookmarks"("user_id", "lesson_id");
ALTER TABLE "lesson_bookmarks" ADD CONSTRAINT "lesson_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_bookmarks" ADD CONSTRAINT "lesson_bookmarks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "lesson_notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lesson_notes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lesson_notes_user_id_lesson_id_key" ON "lesson_notes"("user_id", "lesson_id");
ALTER TABLE "lesson_notes" ADD CONSTRAINT "lesson_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_notes" ADD CONSTRAINT "lesson_notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "lesson_questions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_questions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "lesson_questions_lesson_id_idx" ON "lesson_questions"("lesson_id");
ALTER TABLE "lesson_questions" ADD CONSTRAINT "lesson_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_questions" ADD CONSTRAINT "lesson_questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "lesson_answers" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_answers_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "lesson_answers" ADD CONSTRAINT "lesson_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "lesson_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_answers" ADD CONSTRAINT "lesson_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "project_submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_submissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "project_submissions_lesson_id_idx" ON "project_submissions"("lesson_id");
ALTER TABLE "project_submissions" ADD CONSTRAINT "project_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_submissions" ADD CONSTRAINT "project_submissions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "course_ratings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "course_ratings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "course_ratings_user_id_course_id_key" ON "course_ratings"("user_id", "course_id");
CREATE INDEX "course_ratings_course_id_idx" ON "course_ratings"("course_id");
ALTER TABLE "course_ratings" ADD CONSTRAINT "course_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_ratings" ADD CONSTRAINT "course_ratings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "certificates_code_key" ON "certificates"("code");
CREATE UNIQUE INDEX "certificates_user_id_course_id_key" ON "certificates"("user_id", "course_id");
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "course_promotions" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "percent_off" INTEGER NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "course_promotions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "course_promotions_course_id_code_key" ON "course_promotions"("course_id", "code");
ALTER TABLE "course_promotions" ADD CONSTRAINT "course_promotions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
