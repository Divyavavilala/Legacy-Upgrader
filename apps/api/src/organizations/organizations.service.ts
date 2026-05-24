import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Organization, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma';
import { SubscriptionsService } from '../platform/subscriptions.service';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async create(data: Prisma.OrganizationCreateInput): Promise<Organization> {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new ConflictException('Organization slug already exists');
    }

    return this.prisma.organization.create({ data });
  }

  async findById(id: string): Promise<Organization> {
    const organization = await this.prisma.organization.findUnique({ where: { id } });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { slug } });
  }

  async getWithSubscription(organizationId: string) {
    await this.subscriptionsService.ensureSubscription(organizationId);

    return this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { members: true, repositories: true } },
      },
    });
  }

  async update(organizationId: string, dto: UpdateOrganizationDto) {
    if (dto.slug) {
      const existing = await this.prisma.organization.findFirst({
        where: { slug: dto.slug, NOT: { id: organizationId } },
      });
      if (existing) {
        throw new ConflictException('Organization slug already exists');
      }
    }

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.settings !== undefined && { settings: dto.settings as Prisma.InputJsonValue }),
      },
      include: {
        subscription: { include: { plan: true } },
      },
    });
  }

  async switchUserOrganization(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUniqueOrThrow({
      where: { userId_organizationId: { userId, organizationId } },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        organizationId,
        role: membership.role,
      },
    });

    return membership;
  }

  async createMemberForOwner(
    userId: string,
    organizationId: string,
    role: UserRole,
  ): Promise<void> {
    await this.prisma.organizationMember.upsert({
      where: { userId_organizationId: { userId, organizationId } },
      create: { userId, organizationId, role },
      update: { role },
    });
  }
}
