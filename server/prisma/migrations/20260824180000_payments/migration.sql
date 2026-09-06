-- AlterEnum
ALTER TYPE "PaymentGateway" ADD VALUE IF NOT EXISTS 'MTN_MOMO';
ALTER TYPE "PaymentGateway" ADD VALUE IF NOT EXISTS 'WALLET';

DO $$ BEGIN
  CREATE TYPE "PaymentPurpose" AS ENUM ('TEMPLATE', 'WALLET_TOPUP', 'COURSE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet_usd" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet_lrd" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amount_usd" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amount_lrd" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "fx_rate" DECIMAL(12,4) NOT NULL DEFAULT 190;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'BANFFPAY';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "purpose" "PaymentPurpose" NOT NULL DEFAULT 'TEMPLATE';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "checkout_url" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "ussd_code" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "qr_payload" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "raw_payload" JSONB;

UPDATE "payments" SET "reference" = "id" WHERE "reference" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "payments_reference_key" ON "payments"("reference");
CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_key_key" ON "payments"("idempotency_key");
CREATE INDEX IF NOT EXISTS "payments_reference_idx" ON "payments"("reference");

CREATE TABLE IF NOT EXISTS "payment_items" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "template_id" TEXT,
    "title" TEXT NOT NULL,
    "amount_usd" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "payment_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payment_items_paymentId_idx" ON "payment_items"("payment_id");
ALTER TABLE "payment_items" DROP CONSTRAINT IF EXISTS "payment_items_payment_id_fkey";
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "payment_events" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payment_events_paymentId_idx" ON "payment_events"("payment_id");
ALTER TABLE "payment_events" DROP CONSTRAINT IF EXISTS "payment_events_payment_id_fkey";
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "wallet_ledgers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "currency" TEXT NOT NULL,
    "delta" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_ledgers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "wallet_ledgers_userId_idx" ON "wallet_ledgers"("user_id");
ALTER TABLE "wallet_ledgers" DROP CONSTRAINT IF EXISTS "wallet_ledgers_user_id_fkey";
ALTER TABLE "wallet_ledgers" ADD CONSTRAINT "wallet_ledgers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallet_ledgers" DROP CONSTRAINT IF EXISTS "wallet_ledgers_payment_id_fkey";
ALTER TABLE "wallet_ledgers" ADD CONSTRAINT "wallet_ledgers_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
