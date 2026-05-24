-- CreateTable
CREATE TABLE "ai_insights" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "agent_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_token_usage" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "scan_id" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "agent_type" TEXT,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost_usd" DECIMAL(10,6),
    "cache_hit" BOOLEAN NOT NULL DEFAULT false,
    "request_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_token_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_insights_scan_id_idx" ON "ai_insights"("scan_id");
CREATE INDEX "ai_insights_scan_id_agent_type_idx" ON "ai_insights"("scan_id", "agent_type");
CREATE INDEX "ai_token_usage_organization_id_idx" ON "ai_token_usage"("organization_id");
CREATE INDEX "ai_token_usage_scan_id_idx" ON "ai_token_usage"("scan_id");
CREATE INDEX "ai_token_usage_provider_idx" ON "ai_token_usage"("provider");
CREATE INDEX "ai_token_usage_created_at_idx" ON "ai_token_usage"("created_at");

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_token_usage" ADD CONSTRAINT "ai_token_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_token_usage" ADD CONSTRAINT "ai_token_usage_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
