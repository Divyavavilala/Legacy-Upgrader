import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeysService } from '../../api-keys/api-keys.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { isApiKeyFormat } from '../../api-keys/api-keys.util';

@Injectable()
export class UnifiedAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeysService: ApiKeysService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: unknown;
    }>();

    const apiKeyHeader = request.headers['x-api-key'];
    const rawKey = typeof apiKeyHeader === 'string' ? apiKeyHeader : undefined;

    if (rawKey && isApiKeyFormat(rawKey)) {
      request.user = await this.apiKeysService.validate(rawKey);
      return true;
    }

    if (rawKey) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const result = await super.canActivate(context);
    return result as boolean;
  }
}
