ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "file_key" TEXT;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "preview_key" TEXT;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "demo_url" TEXT;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "video_tutorial" TEXT;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "rows" INTEGER;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "columns" INTEGER;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "software_required" TEXT NOT NULL DEFAULT 'Excel / Google Sheets';
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "version" TEXT NOT NULL DEFAULT '1.0';
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "download_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "rating_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "templates_published_idx" ON "templates"("published");

CREATE TABLE IF NOT EXISTS "template_ratings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "template_ratings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "template_ratings_userId_templateId_key" ON "template_ratings"("user_id", "template_id");
CREATE INDEX IF NOT EXISTS "template_ratings_templateId_idx" ON "template_ratings"("template_id");
ALTER TABLE "template_ratings" DROP CONSTRAINT IF EXISTS "template_ratings_user_id_fkey";
ALTER TABLE "template_ratings" ADD CONSTRAINT "template_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_ratings" DROP CONSTRAINT IF EXISTS "template_ratings_template_id_fkey";
ALTER TABLE "template_ratings" ADD CONSTRAINT "template_ratings_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "template_questions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "template_questions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "template_questions_templateId_idx" ON "template_questions"("template_id");
ALTER TABLE "template_questions" DROP CONSTRAINT IF EXISTS "template_questions_user_id_fkey";
ALTER TABLE "template_questions" ADD CONSTRAINT "template_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_questions" DROP CONSTRAINT IF EXISTS "template_questions_template_id_fkey";
ALTER TABLE "template_questions" ADD CONSTRAINT "template_questions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "template_answers" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "template_answers_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "template_answers" DROP CONSTRAINT IF EXISTS "template_answers_question_id_fkey";
ALTER TABLE "template_answers" ADD CONSTRAINT "template_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "template_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_answers" DROP CONSTRAINT IF EXISTS "template_answers_user_id_fkey";
ALTER TABLE "template_answers" ADD CONSTRAINT "template_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "download_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "download_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "download_tokens_token_hash_key" ON "download_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "download_tokens_templateId_idx" ON "download_tokens"("template_id");
ALTER TABLE "download_tokens" DROP CONSTRAINT IF EXISTS "download_tokens_user_id_fkey";
ALTER TABLE "download_tokens" ADD CONSTRAINT "download_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "download_tokens" DROP CONSTRAINT IF EXISTS "download_tokens_template_id_fkey";
ALTER TABLE "download_tokens" ADD CONSTRAINT "download_tokens_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "cart_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_userId_templateId_key" ON "cart_items"("user_id", "template_id");
ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_user_id_fkey";
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_template_id_fkey";
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
