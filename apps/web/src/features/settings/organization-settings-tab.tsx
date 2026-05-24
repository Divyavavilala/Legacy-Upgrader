import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/api/sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';

export function OrganizationSettingsTab() {
  const queryClient = useQueryClient();
  const hydrate = useAuthStore((s) => s.hydrate);
  const { data: org, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: () => api.organizations.current(),
  });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    if (org) {
      setName(org.name);
      setSlug(org.slug);
    }
  }, [org]);

  const updateMutation = useMutation({
    mutationFn: () => api.organizations.update({ name, slug }),
    onSuccess: async () => {
      toast.success('Organization updated');
      await queryClient.invalidateQueries({ queryKey: ['organization'] });
      await hydrate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const switchMutation = useMutation({
    mutationFn: (organizationId: string) => api.auth.switchOrganization(organizationId),
    onSuccess: async () => {
      toast.success('Organization switched');
      await hydrate();
      window.location.reload();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: memberships } = useQuery({
    queryKey: ['memberships'],
    queryFn: () => api.auth.me().then((p) => p.memberships ?? []),
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
          <CardDescription>Update your organization name and URL slug.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">Slug</Label>
            <Input id="org-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            Save changes
          </Button>
        </CardContent>
      </Card>

      {memberships && memberships.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Switch organization</CardTitle>
            <CardDescription>Select which organization you are working in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {memberships.map((m) => (
              <div
                key={m.organization.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="font-medium">{m.organization.name}</p>
                  <p className="text-xs text-muted-foreground">{m.role}</p>
                </div>
                {org?.id !== m.organization.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => switchMutation.mutate(m.organization.id)}
                    disabled={switchMutation.isPending}
                  >
                    Switch
                  </Button>
                )}
                {org?.id === m.organization.id && (
                  <span className="text-xs text-muted-foreground">Active</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {org?.subscription?.plan && (
        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
            <CardDescription>Billing integration coming soon.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{org.subscription.plan.name}</p>
            <p className="text-sm text-muted-foreground">
              Tier: {org.subscription.plan.tier}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
