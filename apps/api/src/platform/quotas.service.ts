import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { SubscriptionsService } from './subscriptions.service';
import { UsageService } from './usage.service';

export type QuotaResource = 'repositories' | 'scans' | 'ai_tokens' | 'members' | 'api_keys';

@Injectable()
export class QuotasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly usageService: UsageService,
  ) {}

  async assertWithinQuota(organizationId: string, resource: QuotaResource): Promise<void> {
    const subscription = await this.subscriptionsService.getForOrganization(organizationId);
    const plan = subscription.plan;
    const usage = await this.usageService.getCurrentUsage(organizationId);

    switch (resource) {
      case 'repositories':
        if (usage.repositories >= plan.maxRepositories) {
          throw new ForbiddenException(
            `Repository limit reached (${plan.maxRepositories}). Upgrade your plan to add more.`,
          );
        }
        break;
      case 'scans':
        if (usage.scans >= plan.maxScansPerMonth) {
          throw new ForbiddenException(
            `Monthly scan limit reached (${plan.maxScansPerMonth}). Upgrade your plan or wait until next period.`,
          );
        }
        break;
      case 'ai_tokens':
        if (usage.aiTokens >= plan.maxAiTokensPerMonth) {
          throw new ForbiddenException(
            `Monthly AI token quota exceeded (${plan.maxAiTokensPerMonth}). Upgrade your plan.`,
          );
        }
        break;
      case 'members': {
        const memberCount = await this.prisma.organizationMember.count({
          where: { organizationId },
        });
        if (memberCount >= plan.maxMembers) {
          throw new ForbiddenException(
            `Member limit reached (${plan.maxMembers}). Upgrade your plan to invite more members.`,
          );
        }
        break;
      }
      case 'api_keys': {
        const keyCount = await this.prisma.organizationApiKey.count({
          where: { organizationId, revokedAt: null },
        });
        if (keyCount >= plan.maxApiKeys) {
          throw new ForbiddenException(
            `API key limit reached (${plan.maxApiKeys}). Revoke unused keys or upgrade your plan.`,
          );
        }
        break;
      }
    }
  }

  async getEntitlements(organizationId: string) {
    const subscription = await this.subscriptionsService.getForOrganization(organizationId);
    const usage = await this.usageService.getCurrentUsage(organizationId);
    const plan = subscription.plan;

    return {
      plan: {
        tier: plan.tier,
        name: plan.name,
      },
      limits: {
        maxRepositories: plan.maxRepositories,
        maxScansPerMonth: plan.maxScansPerMonth,
        maxAiTokensPerMonth: plan.maxAiTokensPerMonth,
        maxMembers: plan.maxMembers,
        reportRetentionDays: plan.reportRetentionDays,
        maxApiKeys: plan.maxApiKeys,
      },
      usage: {
        repositories: usage.repositories,
        scans: usage.scans,
        aiTokens: usage.aiTokens,
        workerJobs: usage.workerJobs,
        storageBytes: usage.storageBytes,
      },
      remaining: {
        repositories: Math.max(0, plan.maxRepositories - usage.repositories),
        scans: Math.max(0, plan.maxScansPerMonth - usage.scans),
        aiTokens: Math.max(0, plan.maxAiTokensPerMonth - usage.aiTokens),
      },
    };
  }
}
