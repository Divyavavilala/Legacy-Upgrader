import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SubscriptionTier } from '@prisma/client';
import { PrismaService } from '../prisma';

const DEFAULT_PLANS = [
  {
    id: 'plan_free',
    tier: SubscriptionTier.FREE,
    name: 'Free',
    maxRepositories: 3,
    maxScansPerMonth: 10,
    maxAiTokensPerMonth: 50_000,
    maxMembers: 3,
    reportRetentionDays: 30,
    maxApiKeys: 2,
  },
  {
    id: 'plan_starter',
    tier: SubscriptionTier.STARTER,
    name: 'Starter',
    maxRepositories: 10,
    maxScansPerMonth: 50,
    maxAiTokensPerMonth: 250_000,
    maxMembers: 10,
    reportRetentionDays: 90,
    maxApiKeys: 5,
  },
  {
    id: 'plan_pro',
    tier: SubscriptionTier.PROFESSIONAL,
    name: 'Professional',
    maxRepositories: 50,
    maxScansPerMonth: 250,
    maxAiTokensPerMonth: 1_000_000,
    maxMembers: 50,
    reportRetentionDays: 365,
    maxApiKeys: 15,
  },
  {
    id: 'plan_enterprise',
    tier: SubscriptionTier.ENTERPRISE,
    name: 'Enterprise',
    maxRepositories: 500,
    maxScansPerMonth: 5000,
    maxAiTokensPerMonth: 10_000_000,
    maxMembers: 500,
    reportRetentionDays: 730,
    maxApiKeys: 50,
  },
] as const;

@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger(PlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    for (const plan of DEFAULT_PLANS) {
      await this.prisma.plan.upsert({
        where: { tier: plan.tier },
        create: plan,
        update: {
          name: plan.name,
          maxRepositories: plan.maxRepositories,
          maxScansPerMonth: plan.maxScansPerMonth,
          maxAiTokensPerMonth: plan.maxAiTokensPerMonth,
          maxMembers: plan.maxMembers,
          reportRetentionDays: plan.reportRetentionDays,
          maxApiKeys: plan.maxApiKeys,
        },
      });
    }
    this.logger.log('Subscription plans initialized');
  }

  async findByTier(tier: SubscriptionTier) {
    return this.prisma.plan.findUniqueOrThrow({ where: { tier } });
  }

  async findAll() {
    return this.prisma.plan.findMany({ orderBy: { maxRepositories: 'asc' } });
  }

  async getFreePlan() {
    return this.findByTier(SubscriptionTier.FREE);
  }
}
