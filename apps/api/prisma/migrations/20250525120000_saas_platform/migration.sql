-- SaaS platform: plans, memberships, usage, audit, API keys, notifications

CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
CREATE TYPE "ApiKeyScope" AS ENUM ('READ_REPOSITORIES', 'WRITE_REPOSITORIES', 'TRIGGER_SCANS', 'READ_SCANS', 'READ_USAGE', 'MANAGE_SETTINGS');
CREATE TYPE "AuditAction" AS ENUM (
  'ORGANIZATION_UPDATED', 'MEMBER_INVITED', 'MEMBER_JOINED', 'MEMBER_REMOVED', 'MEMBER_ROLE_CHANGED',
  'ORGANIZATION_SWITCHED', 'REPOSITORY_CREATED', 'REPOSITORY_DELETED', 'SCAN_TRIGGERED', 'SCAN_COMPLETED',
  'SCAN_FAILED', 'API_KEY_CREATED', 'API_KEY_ROTATED', 'API_KEY_REVOKED', 'AI_ANALYSIS_STARTED', 'AI_ANALYSIS_COMPLETED'
);
CREATE TYPE "NotificationType" AS ENUM ('SCAN_COMPLETED', 'SCAN_FAILED', 'AI_REPORT_COMPLETED', 'MEMBER_INVITED', 'QUOTA_WARNING', 'SYSTEM');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SLACK', 'DISCORD', 'WEBHOOK');

ALTER TABLE "organizations" ADD COLUMN "settings" JSONB;

CREATE TABLE "plans" (
  "id" TEXT NOT NULL,
  "tier" "SubscriptionTier" NOT NULL,
  "name" TEXT NOT NULL,
  "max_repositories" INTEGER NOT NULL,
  "max_scans_per_month" INTEGER NOT NULL,
  "max_ai_tokens_per_month" INTEGER NOT NULL,
  "max_members" INTEGER NOT NULL,
  "report_retention_days" INTEGER NOT NULL,
  "max_api_keys" INTEGER NOT NULL DEFAULT 5,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plans_tier_key" ON "plans"("tier");

CREATE TABLE "organization_subscriptions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "current_period_start" TIMESTAMP(3) NOT NULL,
  "current_period_end" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_subscriptions_organization_id_key" ON "organization_subscriptions"("organization_id");
CREATE INDEX "organization_subscriptions_plan_id_idx" ON "organization_subscriptions"("plan_id");

ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "organization_members" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'DEVELOPER',
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_members_user_id_organization_id_key" ON "organization_members"("user_id", "organization_id");
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members"("organization_id");

ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "organization_invitations" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'DEVELOPER',
  "token_hash" TEXT NOT NULL,
  "invited_by_id" TEXT NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_invitations_token_hash_key" ON "organization_invitations"("token_hash");
CREATE INDEX "organization_invitations_organization_id_idx" ON "organization_invitations"("organization_id");
CREATE INDEX "organization_invitations_organization_id_status_idx" ON "organization_invitations"("organization_id", "status");
CREATE INDEX "organization_invitations_email_idx" ON "organization_invitations"("email");

ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_invited_by_id_fkey"
  FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "organization_usage_metrics" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "period_year" INTEGER NOT NULL,
  "period_month" INTEGER NOT NULL,
  "scan_count" INTEGER NOT NULL DEFAULT 0,
  "ai_tokens_used" INTEGER NOT NULL DEFAULT 0,
  "repository_count" INTEGER NOT NULL DEFAULT 0,
  "worker_jobs_count" INTEGER NOT NULL DEFAULT 0,
  "storage_bytes" BIGINT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_usage_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_usage_metrics_organization_id_period_year_period_month_key"
  ON "organization_usage_metrics"("organization_id", "period_year", "period_month");
CREATE INDEX "organization_usage_metrics_organization_id_idx" ON "organization_usage_metrics"("organization_id");

ALTER TABLE "organization_usage_metrics" ADD CONSTRAINT "organization_usage_metrics_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "organization_api_keys" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "key_prefix" TEXT NOT NULL,
  "key_hash" TEXT NOT NULL,
  "scopes" "ApiKeyScope"[],
  "last_used_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_api_keys_key_hash_key" ON "organization_api_keys"("key_hash");
CREATE INDEX "organization_api_keys_organization_id_idx" ON "organization_api_keys"("organization_id");
CREATE INDEX "organization_api_keys_key_prefix_idx" ON "organization_api_keys"("key_prefix");

ALTER TABLE "organization_api_keys" ADD CONSTRAINT "organization_api_keys_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "user_id" TEXT,
  "api_key_id" TEXT,
  "action" "AuditAction" NOT NULL,
  "resource_type" TEXT,
  "resource_id" TEXT,
  "metadata" JSONB,
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");
CREATE INDEX "audit_logs_organization_id_action_idx" ON "audit_logs"("organization_id", "action");
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_api_key_id_fkey"
  FOREIGN KEY ("api_key_id") REFERENCES "organization_api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "user_id" TEXT,
  "type" "NotificationType" NOT NULL,
  "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
  "title" TEXT NOT NULL,
  "body" TEXT,
  "metadata" JSONB,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_organization_id_created_at_idx" ON "notifications"("organization_id", "created_at");
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "webhook_endpoints" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_endpoints_organization_id_idx" ON "webhook_endpoints"("organization_id");

ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default plans
INSERT INTO "plans" ("id", "tier", "name", "max_repositories", "max_scans_per_month", "max_ai_tokens_per_month", "max_members", "report_retention_days", "max_api_keys", "updated_at")
VALUES
  ('plan_free', 'FREE', 'Free', 3, 10, 50000, 3, 30, 2, CURRENT_TIMESTAMP),
  ('plan_starter', 'STARTER', 'Starter', 10, 50, 250000, 10, 90, 5, CURRENT_TIMESTAMP),
  ('plan_pro', 'PROFESSIONAL', 'Professional', 50, 250, 1000000, 50, 365, 15, CURRENT_TIMESTAMP),
  ('plan_enterprise', 'ENTERPRISE', 'Enterprise', 500, 5000, 10000000, 500, 730, 50, CURRENT_TIMESTAMP);

-- Backfill memberships from existing users
INSERT INTO "organization_members" ("id", "user_id", "organization_id", "role", "joined_at", "created_at", "updated_at")
SELECT
  'om_' || u."id",
  u."id",
  u."organization_id",
  u."role",
  u."created_at",
  u."created_at",
  u."updated_at"
FROM "users" u
ON CONFLICT DO NOTHING;

-- Backfill free subscriptions for existing orgs
INSERT INTO "organization_subscriptions" ("id", "organization_id", "plan_id", "status", "current_period_start", "current_period_end", "created_at", "updated_at")
SELECT
  'sub_' || o."id",
  o."id",
  'plan_free',
  'ACTIVE',
  date_trunc('month', CURRENT_TIMESTAMP),
  (date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month'),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "organizations" o
WHERE NOT EXISTS (
  SELECT 1 FROM "organization_subscriptions" s WHERE s."organization_id" = o."id"
);
