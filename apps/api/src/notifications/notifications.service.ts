import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';

export interface CreateNotificationInput {
  organizationId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
  channel?: NotificationChannel;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        type: input.type,
        channel: input.channel ?? NotificationChannel.IN_APP,
        title: input.title,
        body: input.body,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    await this.dispatchExternalChannels(input);
    return notification;
  }

  async notifyScanCompleted(
    organizationId: string,
    scanId: string,
    repositoryName: string,
    userId?: string,
  ): Promise<void> {
    await this.create({
      organizationId,
      userId,
      type: NotificationType.SCAN_COMPLETED,
      title: `Scan completed: ${repositoryName}`,
      body: `Repository scan finished successfully.`,
      metadata: { scanId, repositoryName },
    });
  }

  async notifyScanFailed(
    organizationId: string,
    scanId: string,
    repositoryName: string,
    errorMessage: string,
    userId?: string,
  ): Promise<void> {
    await this.create({
      organizationId,
      userId,
      type: NotificationType.SCAN_FAILED,
      title: `Scan failed: ${repositoryName}`,
      body: errorMessage,
      metadata: { scanId, repositoryName, errorMessage },
    });
  }

  async notifyAiReportCompleted(
    organizationId: string,
    scanId: string,
    userId?: string,
  ): Promise<void> {
    await this.create({
      organizationId,
      userId,
      type: NotificationType.AI_REPORT_COMPLETED,
      title: 'AI modernization report ready',
      body: 'Your AI analysis report has been generated.',
      metadata: { scanId },
    });
  }

  async listForUser(organizationId: string, userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        organizationId,
        OR: [{ userId }, { userId: null }],
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(notificationId: string, organizationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        organizationId,
        OR: [{ userId }, { userId: null }],
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(organizationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        organizationId,
        OR: [{ userId }, { userId: null }],
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  /** Placeholder for email, Slack, Discord, webhooks */
  private async dispatchExternalChannels(input: CreateNotificationInput): Promise<void> {
    const webhooks = await this.prisma.webhookEndpoint.findMany({
      where: { organizationId: input.organizationId, isActive: true },
    });

    if (webhooks.length === 0) {
      return;
    }

    this.logger.debug(
      `Webhook dispatch queued for org ${input.organizationId} (${webhooks.length} endpoints)`,
    );
  }
}
