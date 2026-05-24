import type { ApiKeyScope, UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  authType?: 'jwt' | 'api_key';
  apiKeyScopes?: ApiKeyScope[];
  apiKeyId?: string;
}
