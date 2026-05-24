import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, InvitationStatus, NotificationType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import type { EnvConfig } from '../config/env.validation';
import { NotificationsService } from '../notifications/notifications.service';
import { QuotasService } from '../platform/quotas.service';
import { PrismaService } from '../prisma';
import { UsersService } from '../users';
import type { InviteMemberDto } from './dto/invite-member.dto';

@Injectable()
export class MembersService {
  private readonly bcryptRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    private readonly quotasService: QuotasService,
    private readonly notificationsService: NotificationsService,
    config: ConfigService<EnvConfig, true>,
  ) {
    this.bcryptRounds = config.get('BCRYPT_ROUNDS', { infer: true });
  }

  async listMembers(organizationId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async listInvitations(organizationId: string) {
    return this.prisma.organizationInvitation.findMany({
      where: { organizationId, status: InvitationStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async invite(organizationId: string, invitedById: string, dto: InviteMemberDto) {
    await this.quotasService.assertWithinQuota(organizationId, 'members');

    const email = dto.email.toLowerCase();

    const existingMember = await this.prisma.organizationMember.findFirst({
      where: { organizationId, user: { email } },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this organization');
    }

    const pending = await this.prisma.organizationInvitation.findFirst({
      where: { organizationId, email, status: InvitationStatus.PENDING },
    });

    if (pending) {
      throw new ConflictException('Invitation already pending for this email');
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 86_400_000);

    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        organizationId,
        email,
        role: dto.role,
        tokenHash,
        invitedById,
        expiresAt,
      },
    });

    await this.auditService.log({
      organizationId,
      userId: invitedById,
      action: AuditAction.MEMBER_INVITED,
      resourceType: 'invitation',
      resourceId: invitation.id,
      metadata: { email, role: dto.role },
    });

    await this.notificationsService.create({
      organizationId,
      type: NotificationType.MEMBER_INVITED,
      title: `Invitation sent to ${email}`,
      body: `Pending invitation expires ${expiresAt.toISOString()}`,
      metadata: { invitationId: invitation.id },
    });

    return {
      invitationId: invitation.id,
      email,
      role: dto.role,
      expiresAt,
      acceptToken: rawToken,
    };
  }

  async acceptInvitation(dto: { token: string; password?: string; name?: string }) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');

    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { tokenHash },
      include: { organization: true },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new NotFoundException('Invitation not found or no longer valid');
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Invitation has expired');
    }

    let user = await this.usersService.findByEmail(invitation.email);

    if (!user) {
      if (!dto.password) {
        throw new BadRequestException('Password is required to create a new account');
      }
      const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);
      user = await this.prisma.user.create({
        data: {
          email: invitation.email,
          name: dto.name,
          passwordHash,
          role: invitation.role,
          organizationId: invitation.organizationId,
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });
    }

    await this.prisma.$transaction([
      this.prisma.organizationMember.upsert({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: invitation.organizationId,
          },
        },
        create: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
        update: { role: invitation.role },
      }),
      this.prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
      }),
    ]);

    await this.auditService.log({
      organizationId: invitation.organizationId,
      userId: user.id,
      action: AuditAction.MEMBER_JOINED,
      resourceType: 'user',
      resourceId: user.id,
      metadata: { invitationId: invitation.id },
    });

    return this.usersService.sanitizeUser(
      await this.usersService.findById(user.id),
    );
  }

  async updateRole(
    organizationId: string,
    memberUserId: string,
    role: UserRole,
    actorId: string,
    actorRole: UserRole,
  ) {
    if (role === UserRole.OWNER) {
      throw new ForbiddenException('Cannot assign OWNER role');
    }

    const member = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: memberUserId, organizationId } },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === UserRole.OWNER && actorRole !== UserRole.OWNER) {
      throw new ForbiddenException('Only owners can change owner roles');
    }

    if (memberUserId === actorId && member.role === UserRole.OWNER) {
      throw new ForbiddenException('Owners cannot change their own role');
    }

    await this.prisma.$transaction([
      this.prisma.organizationMember.update({
        where: { id: member.id },
        data: { role },
      }),
      this.prisma.user.update({
        where: { id: memberUserId },
        data: { role },
      }),
    ]);

    await this.auditService.log({
      organizationId,
      userId: actorId,
      action: AuditAction.MEMBER_ROLE_CHANGED,
      resourceType: 'user',
      resourceId: memberUserId,
      metadata: { newRole: role },
    });
  }

  async removeMember(
    organizationId: string,
    memberUserId: string,
    actorId: string,
    actorRole: UserRole,
  ) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: memberUserId, organizationId } },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === UserRole.OWNER) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: { organizationId, role: UserRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the only owner');
      }
      if (actorRole !== UserRole.OWNER) {
        throw new ForbiddenException('Only owners can remove owners');
      }
    }

    if (memberUserId === actorId) {
      throw new BadRequestException('Cannot remove yourself');
    }

    await this.prisma.organizationMember.delete({ where: { id: member.id } });

    await this.prisma.user.update({
      where: { id: memberUserId },
      data: { isActive: false },
    });

    await this.auditService.log({
      organizationId,
      userId: actorId,
      action: AuditAction.MEMBER_REMOVED,
      resourceType: 'user',
      resourceId: memberUserId,
    });
  }

  async listUserOrganizations(userId: string) {
    return this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }
}
