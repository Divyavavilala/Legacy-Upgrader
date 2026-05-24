import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PlansService } from './plans.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
  ) {}

  async ensureSubscription(organizationId: string) {
    const existing = await this.prisma.organizationSubscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (existing) {
      return existing;
    }

    const freePlan = await this.plansService.getFreePlan();
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return this.prisma.organizationSubscription.create({
      data: {
        organizationId,
        planId: freePlan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });
  }

  async getForOrganization(organizationId: string) {
    return this.ensureSubscription(organizationId);
  }
}
