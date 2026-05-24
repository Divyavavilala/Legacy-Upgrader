import type { UserRole } from '@prisma/client';

export type JwtTokenType = 'access' | 'refresh';

export interface AuthJwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  role: UserRole;
  type: JwtTokenType;
}
