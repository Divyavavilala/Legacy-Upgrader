import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/api/sdk';
import type { UserRole } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';

const ROLES: UserRole[] = ['ADMIN', 'DEVELOPER', 'VIEWER'];

export function TeamTab() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('DEVELOPER');
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.members.list(),
  });

  const { data: invitations } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => api.members.listInvitations(),
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.members.invite({ email, role }),
    onSuccess: (data) => {
      toast.success('Invitation created');
      setInviteToken(data.acceptToken);
      setEmail('');
      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.members.remove(userId),
    onSuccess: () => {
      toast.success('Member removed');
      void queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: UserRole }) =>
      api.members.updateRole(userId, { role: newRole }),
    onSuccess: () => {
      toast.success('Role updated');
      void queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Invite member</CardTitle>
            <CardDescription>Send an invitation link to join your organization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || !email}
            >
              Send invitation
            </Button>
            {inviteToken && (
              <p className="rounded-md bg-muted p-3 text-xs break-all">
                Share accept token: <code>{inviteToken}</code>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members?.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
            >
              <div>
                <p className="font-medium">{m.user.name ?? m.user.email}</p>
                <p className="text-xs text-muted-foreground">{m.user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {canManage && m.user.id !== user?.id && m.role !== 'OWNER' ? (
                  <select
                    className="rounded-md border border-input px-2 py-1 text-sm"
                    value={m.role}
                    onChange={(e) =>
                      roleMutation.mutate({
                        userId: m.user.id,
                        newRole: e.target.value as UserRole,
                      })
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-muted-foreground">{m.role}</span>
                )}
                {canManage && m.user.id !== user?.id && m.role !== 'OWNER' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeMutation.mutate(m.user.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex justify-between text-sm">
                <span>{inv.email}</span>
                <span className="text-muted-foreground">{inv.role}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
