import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { detectRepositoryProvider } from '../common/utils/detect-repository-provider';
import type { CreateRepositoryDto } from './dto';

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateRepositoryDto) {
    try {
      const repository = await this.prisma.repository.create({
        data: {
          organizationId,
          name: dto.name.trim(),
          slug: dto.slug.trim().toLowerCase(),
          url: dto.gitUrl.trim(),
          provider: detectRepositoryProvider(dto.gitUrl),
          defaultBranch: dto.defaultBranch?.trim() ?? 'main',
        },
      });

      this.logger.log(`Repository created: ${repository.id} (${repository.slug})`);
      return repository;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Repository slug "${dto.slug}" already exists in this organization`,
        );
      }
      throw error;
    }
  }

  async findAllByOrganization(organizationId: string) {
    return this.prisma.repository.findMany({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { scans: true } },
        scans: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            progress: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });
  }

  async findByIdForOrganization(id: string, organizationId: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id, organizationId, isActive: true },
      include: {
        _count: { select: { scans: true } },
      },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found');
    }

    return repository;
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const repository = await this.findByIdForOrganization(id, organizationId);

    await this.prisma.repository.delete({
      where: { id: repository.id },
    });

    this.logger.log(`Repository deleted: ${id}`);
  }
}
