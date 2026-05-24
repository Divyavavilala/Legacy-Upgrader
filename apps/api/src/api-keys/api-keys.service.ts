import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuditAction, ApiKeyScope, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { QuotasService } from '../platform/quotas.service';
import { PrismaService } from '../prisma';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { generateApiKey, hashApiKey } from './api-keys.util';
import type { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly quotasService: QuotasService,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateApiKeyDto) {
    await this.quotasService.assertWithinQuota(organizationId, 'api_keys');

    const { rawKey, prefix, hash } = generateApiKey();
    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 86_400_000)
      : null;

    const apiKey = await this.prisma.organizationApiKey.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        keyPrefix: prefix,
        keyHash: hash,
        scopes: dto.scopes,
        expiresAt,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.API_KEY_CREATED,
      resourceType: 'api_key',
      resourceId: apiKey.id,
      metadata: { name: apiKey.name, scopes: dto.scopes },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      rawKey,
    };
  }

  async list(organizationId: string) {
    return this.prisma.organizationApiKey.findMany({
      where: { organizationId, revokedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(organizationId: string, keyId: string, userId: string) {
    const key = await this.prisma.organizationApiKey.findFirst({
      where: { id: keyId, organizationId, revokedAt: null },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.organizationApiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.API_KEY_REVOKED,
      resourceType: 'api_key',
      resourceId: keyId,
    });
  }

  async rotate(organizationId: string, keyId: string, userId: string) {
    await this.revoke(organizationId, keyId, userId);
    const existing = await this.prisma.organizationApiKey.findUnique({ where: { id: keyId } });
    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    const created = await this.create(organizationId, userId, {
      name: `${existing.name} (rotated)`,
      scopes: existing.scopes,
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.API_KEY_ROTATED,
      resourceType: 'api_key',
      resourceId: created.id,
      metadata: { previousKeyId: keyId },
    });

    return created;
  }

  async validate(rawKey: string): Promise<AuthenticatedUser> {
    if (!rawKey?.trim()) {
      throw new UnauthorizedException('Invalid API key');
    }

    const hash = hashApiKey(rawKey.trim());
    const apiKey = await this.prisma.organizationApiKey.findUnique({
      where: { keyHash: hash },
    });

    if (!apiKey || apiKey.revokedAt) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired');
    }

    await this.prisma.organizationApiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    const role = this.resolveRoleFromScopes(apiKey.scopes);

    return {
      id: apiKey.id,
      email: `api-key@${apiKey.keyPrefix}`,
      organizationId: apiKey.organizationId,
      role,
      authType: 'api_key',
      apiKeyScopes: apiKey.scopes,
      apiKeyId: apiKey.id,
    };
  }

  hasScope(user: AuthenticatedUser, scope: ApiKeyScope): boolean {
    if (user.authType !== 'api_key') {
      return true;
    }
    return user.apiKeyScopes?.includes(scope) ?? false;
  }

  private resolveRoleFromScopes(scopes: ApiKeyScope[]): UserRole {
    if (scopes.includes(ApiKeyScope.MANAGE_SETTINGS)) {
      return UserRole.ADMIN;
    }
    if (
      scopes.includes(ApiKeyScope.WRITE_REPOSITORIES) ||
      scopes.includes(ApiKeyScope.TRIGGER_SCANS)
    ) {
      return UserRole.DEVELOPER;
    }
    return UserRole.VIEWER;
  }
}
