import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { OrgIsolationService } from '../security/org-isolation.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { EnvConfig } from '../config/env.validation';
import { OrganizationsService } from '../organizations';
import { SubscriptionsService } from '../platform/subscriptions.service';
import { PrismaService } from '../prisma';
import { UsersService } from '../users';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { AuthJwtPayload } from './interfaces/jwt-payload.interface';
import { generateSecureToken, hashRefreshToken, parseDurationToMs } from './utils/token.util';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly refreshPepper: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;
  private readonly bcryptRounds: number;
  private readonly refreshExpiresMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditService: AuditService,
    private readonly orgIsolationService: OrgIsolationService,
    private readonly jwtService: JwtService,
    config: ConfigService<EnvConfig, true>,
  ) {
    this.accessSecret = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.refreshSecret = config.get('JWT_REFRESH_SECRET', { infer: true });
    this.refreshPepper = config.get('JWT_REFRESH_PEPPER', { infer: true });
    this.accessExpiresIn = config.get('JWT_ACCESS_EXPIRES_IN', { infer: true });
    this.refreshExpiresIn = config.get('JWT_REFRESH_EXPIRES_IN', { infer: true });
    this.bcryptRounds = config.get('BCRYPT_ROUNDS', { infer: true });
    this.refreshExpiresMs = parseDurationToMs(this.refreshExpiresIn);
  }

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const slugTaken = await this.organizationsService.findBySlug(dto.organizationSlug);
    if (slugTaken) {
      throw new ConflictException('Organization slug already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    const user = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug: dto.organizationSlug,
        },
      });

      const createdUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          name: dto.name,
          passwordHash,
          role: UserRole.OWNER,
          organizationId: organization.id,
        },
      });

      await tx.organizationMember.create({
        data: {
          userId: createdUser.id,
          organizationId: organization.id,
          role: UserRole.OWNER,
        },
      });

      return { user: createdUser, organizationId: organization.id };
    });

    await this.subscriptionsService.ensureSubscription(user.organizationId);

    return this.issueTokenPair(user.user);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email.toLowerCase());

    if (!user?.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.usersService.updateLastLogin(user.id);
    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: AuthJwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<AuthJwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = hashRefreshToken(refreshToken, this.refreshPepper);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      await this.revokeTokenFamily(stored.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (stored.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(stored.user, stored.familyId);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(refreshToken, this.refreshPepper);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    const sanitized = this.usersService.sanitizeUser(user);
    const organization = await this.organizationsService.getWithSubscription(
      user.organizationId,
    );
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });

    return { ...sanitized, organization, memberships };
  }

  async switchOrganization(userId: string, organizationId: string): Promise<AuthTokens & { organization: { id: string; name: string; slug: string }; role: UserRole }> {
    await this.orgIsolationService.assertUserBelongsToOrg(userId, organizationId);

    const membership = await this.organizationsService.switchUserOrganization(
      userId,
      organizationId,
    );

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.ORGANIZATION_SWITCHED,
      resourceType: 'organization',
      resourceId: organizationId,
    });

    const user = await this.usersService.findById(userId);
    const tokens = await this.issueTokenPair(user);

    return {
      ...tokens,
      organization: membership.organization,
      role: membership.role,
    };
  }

  async issueTokensForUser(userId: string): Promise<AuthTokens> {
    const user = await this.usersService.findById(userId);
    return this.issueTokenPair(user);
  }

  private async issueTokenPair(
    user: {
      id: string;
      email: string;
      organizationId: string;
      role: UserRole;
    },
    existingFamilyId?: string,
  ): Promise<AuthTokens> {
    const accessPayload: AuthJwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      type: 'access',
    };

    const refreshPayload: AuthJwtPayload = {
      ...accessPayload,
      type: 'refresh',
    };

    const accessExpiresSec = Math.floor(parseDurationToMs(this.accessExpiresIn) / 1000);
    const refreshExpiresSec = Math.floor(parseDurationToMs(this.refreshExpiresIn) / 1000);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.accessSecret,
        expiresIn: accessExpiresSec,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: refreshExpiresSec,
      }),
    ]);

    const familyId = existingFamilyId ?? generateSecureToken(16);
    const expiresAt = new Date(Date.now() + this.refreshExpiresMs);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken, this.refreshPepper),
        familyId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessExpiresSec,
    };
  }

  private async revokeTokenFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
