import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { PrismaService } from '../prisma';

@Injectable()
export class OrgIsolationService {
  constructor(private readonly prisma: PrismaService) {}

  async assertUserBelongsToOrg(userId: string, organizationId: string): Promise<void> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization');
    }
  }

  async verifyRequestContext(user: AuthenticatedUser): Promise<void> {
    if (user.authType === 'api_key') {
      return;
    }
    await this.assertUserBelongsToOrg(user.id, user.organizationId);
  }
}
