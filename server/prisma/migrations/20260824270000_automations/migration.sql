CREATE TABLE IF NOT EXISTS "automation_workflows" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "template_slug" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "trigger_type" TEXT NOT NULL,
  "trigger_config" JSONB NOT NULL DEFAULT '{}',
  "steps" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "automation_workflows_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "automation_workflows_user_id_idx" ON "automation_workflows"("user_id");
CREATE INDEX IF NOT EXISTS "automation_workflows_enabled_trigger_type_idx" ON "automation_workflows"("enabled", "trigger_type");
ALTER TABLE "automation_workflows" ADD CONSTRAINT "automation_workflows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "automation_runs" (
  "id" TEXT NOT NULL,
  "workflow_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "result" JSONB,
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "automation_runs_workflow_id_created_at_idx" ON "automation_runs"("workflow_id", "created_at");
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "automation_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "outbound_webhooks" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "outbound_webhooks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "outbound_webhooks_user_id_idx" ON "outbound_webhooks"("user_id");
ALTER TABLE "outbound_webhooks" ADD CONSTRAINT "outbound_webhooks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" TEXT NOT NULL,
  "webhook_id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "request_body" TEXT NOT NULL,
  "status_code" INTEGER,
  "error" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "webhook_deliveries_webhook_id_created_at_idx" ON "webhook_deliveries"("webhook_id", "created_at");
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "outbound_webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "inbound_hooks" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "workflow_id" TEXT,
  "token" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inbound_hooks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "inbound_hooks_token_key" ON "inbound_hooks"("token");
CREATE INDEX IF NOT EXISTS "inbound_hooks_user_id_idx" ON "inbound_hooks"("user_id");
ALTER TABLE "inbound_hooks" ADD CONSTRAINT "inbound_hooks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "key_hash" TEXT NOT NULL,
  "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "last_used_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_key_hash_key" ON "api_keys"("key_hash");
CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys"("user_id");
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "oauth_connections" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "meta" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "oauth_connections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_connections_user_id_provider_key" ON "oauth_connections"("user_id", "provider");
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "automation_events" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "stream" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "automation_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "automation_events_user_id_created_at_idx" ON "automation_events"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "automation_events_stream_idx" ON "automation_events"("stream");
ALTER TABLE "automation_events" ADD CONSTRAINT "automation_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
