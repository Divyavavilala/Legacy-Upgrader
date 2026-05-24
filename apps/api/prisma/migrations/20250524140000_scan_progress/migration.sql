-- AlterTable
ALTER TABLE "scans" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "scans" ADD COLUMN "current_stage" TEXT;
