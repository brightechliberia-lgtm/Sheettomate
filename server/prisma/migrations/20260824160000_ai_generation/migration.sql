ALTER TABLE "ai_requests" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "ai_requests" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "ai_requests" ADD COLUMN IF NOT EXISTS "parent_request_id" TEXT;
ALTER TABLE "ai_requests" ADD COLUMN IF NOT EXISTS "progress" TEXT NOT NULL DEFAULT 'queued';
ALTER TABLE "ai_requests" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE "ai_requests" ADD COLUMN IF NOT EXISTS "feedback" TEXT;
ALTER TABLE "ai_requests" ADD COLUMN IF NOT EXISTS "tokens_used" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ai_requests" ADD COLUMN IF NOT EXISTS "cost_usd" DECIMAL(10,4) NOT NULL DEFAULT 0;
ALTER TABLE "ai_requests" ADD COLUMN IF NOT EXISTS "spec_json" JSONB;
ALTER TABLE "ai_requests" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3);

ALTER TABLE "ai_requests" DROP CONSTRAINT IF EXISTS "ai_requests_parent_request_id_fkey";
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_parent_request_id_fkey" FOREIGN KEY ("parent_request_id") REFERENCES "ai_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ai_prompt_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "example_prompt" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_prompt_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ai_prompt_templates_slug_key" ON "ai_prompt_templates"("slug");
CREATE INDEX IF NOT EXISTS "ai_prompt_templates_enabled_idx" ON "ai_prompt_templates"("enabled");

CREATE TABLE IF NOT EXISTS "platform_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);
