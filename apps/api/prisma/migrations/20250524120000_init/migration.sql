-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "RepositoryProvider" AS ENUM ('GITHUB', 'GITLAB', 'BITBUCKET', 'AZURE_DEVOPS', 'LOCAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FindingCategory" AS ENUM ('SECURITY', 'DEPENDENCY', 'CODE_QUALITY', 'ARCHITECTURE', 'LICENSING', 'PERFORMANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "DependencyIssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MigrationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MigrationEffort" AS ENUM ('TRIVIAL', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "MigrationRecommendationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "ModernizationReportStatus" AS ENUM ('DRAFT', 'GENERATING', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QueuedJobType" AS ENUM ('SCAN_REPOSITORY', 'GENERATE_REPORT', 'SYNC_REPOSITORY', 'MIGRATION_ANALYSIS', 'DEPENDENCY_AUDIT', 'OTHER');

-- CreateEnum
CREATE TYPE "QueuedJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER', 'CANCELLED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT,
    "provider" "RepositoryProvider" NOT NULL DEFAULT 'GITHUB',
    "default_branch" TEXT DEFAULT 'main',
    "external_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "branch" TEXT,
    "commit_sha" TEXT,
    "triggered_by" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "category" "FindingCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_path" TEXT,
    "line_start" INTEGER,
    "line_end" INTEGER,
    "rule_id" TEXT,
    "fingerprint" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependency_issues" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "package_name" TEXT NOT NULL,
    "current_version" TEXT,
    "recommended_version" TEXT,
    "severity" "DependencyIssueSeverity" NOT NULL,
    "ecosystem" TEXT,
    "is_direct" BOOLEAN NOT NULL DEFAULT true,
    "cve_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dependency_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_recommendations" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT,
    "scan_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "MigrationPriority" NOT NULL DEFAULT 'MEDIUM',
    "effort" "MigrationEffort" NOT NULL DEFAULT 'MEDIUM',
    "target_stack" TEXT,
    "status" "MigrationRecommendationStatus" NOT NULL DEFAULT 'OPEN',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "migration_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modernization_reports" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "status" "ModernizationReportStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "summary" TEXT,
    "content" JSONB,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modernization_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queued_jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "scan_id" TEXT,
    "created_by_id" TEXT,
    "type" "QueuedJobType" NOT NULL,
    "status" "QueuedJobStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "result" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queued_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "users_organization_id_role_idx" ON "users"("organization_id", "role");

-- CreateIndex
CREATE INDEX "repositories_organization_id_idx" ON "repositories"("organization_id");

-- CreateIndex
CREATE INDEX "repositories_organization_id_is_active_idx" ON "repositories"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_organization_id_slug_key" ON "repositories"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "scans_repository_id_idx" ON "scans"("repository_id");

-- CreateIndex
CREATE INDEX "scans_repository_id_status_idx" ON "scans"("repository_id", "status");

-- CreateIndex
CREATE INDEX "scans_status_idx" ON "scans"("status");

-- CreateIndex
CREATE INDEX "scans_created_at_idx" ON "scans"("created_at");

-- CreateIndex
CREATE INDEX "findings_scan_id_idx" ON "findings"("scan_id");

-- CreateIndex
CREATE INDEX "findings_scan_id_severity_idx" ON "findings"("scan_id", "severity");

-- CreateIndex
CREATE INDEX "findings_scan_id_category_idx" ON "findings"("scan_id", "category");

-- CreateIndex
CREATE INDEX "findings_fingerprint_idx" ON "findings"("fingerprint");

-- CreateIndex
CREATE INDEX "dependency_issues_scan_id_idx" ON "dependency_issues"("scan_id");

-- CreateIndex
CREATE INDEX "dependency_issues_scan_id_severity_idx" ON "dependency_issues"("scan_id", "severity");

-- CreateIndex
CREATE INDEX "dependency_issues_package_name_idx" ON "dependency_issues"("package_name");

-- CreateIndex
CREATE INDEX "migration_recommendations_repository_id_idx" ON "migration_recommendations"("repository_id");

-- CreateIndex
CREATE INDEX "migration_recommendations_scan_id_idx" ON "migration_recommendations"("scan_id");

-- CreateIndex
CREATE INDEX "migration_recommendations_status_idx" ON "migration_recommendations"("status");

-- CreateIndex
CREATE INDEX "migration_recommendations_priority_idx" ON "migration_recommendations"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "modernization_reports_scan_id_key" ON "modernization_reports"("scan_id");

-- CreateIndex
CREATE INDEX "modernization_reports_status_idx" ON "modernization_reports"("status");

-- CreateIndex
CREATE INDEX "queued_jobs_organization_id_idx" ON "queued_jobs"("organization_id");

-- CreateIndex
CREATE INDEX "queued_jobs_scan_id_idx" ON "queued_jobs"("scan_id");

-- CreateIndex
CREATE INDEX "queued_jobs_status_idx" ON "queued_jobs"("status");

-- CreateIndex
CREATE INDEX "queued_jobs_type_status_idx" ON "queued_jobs"("type", "status");

-- CreateIndex
CREATE INDEX "queued_jobs_scheduled_at_idx" ON "queued_jobs"("scheduled_at");

-- CreateIndex
CREATE INDEX "queued_jobs_priority_created_at_idx" ON "queued_jobs"("priority", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependency_issues" ADD CONSTRAINT "dependency_issues_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "migration_recommendations" ADD CONSTRAINT "migration_recommendations_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "migration_recommendations" ADD CONSTRAINT "migration_recommendations_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modernization_reports" ADD CONSTRAINT "modernization_reports_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queued_jobs" ADD CONSTRAINT "queued_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queued_jobs" ADD CONSTRAINT "queued_jobs_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queued_jobs" ADD CONSTRAINT "queued_jobs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
