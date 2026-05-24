import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/api/sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const SCOPES = [
  'READ_REPOSITORIES',
  'WRITE_REPOSITORIES',
  'TRIGGER_SCANS',
  'READ_SCANS',
  'READ_USAGE',
  'MANAGE_SETTINGS',
] as const;

export function ApiKeysTab() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['READ_REPOSITORIES', 'READ_SCANS']);
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.apiKeys.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.apiKeys.create({
        name,
        scopes: selectedScopes as (typeof SCOPES)[number][],
      }),
    onSuccess: (data) => {
      setNewKey(data.rawKey);
      setName('');
      toast.success('API key created');
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.apiKeys.revoke(id),
    onSuccess: () => {
      toast.success('API key revoked');
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create API key</CardTitle>
          <CardDescription>
            Keys are shown once. Store securely. Use header X-API-Key for requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key-name">Name</Label>
            <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Scopes</Label>
            <div className="flex flex-wrap gap-2">
              {SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedScopes([...selectedScopes, scope]);
                      } else {
                        setSelectedScopes(selectedScopes.filter((s) => s !== scope));
                      }
                    }}
                  />
                  {scope}
                </label>
              ))}
            </div>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name || selectedScopes.length === 0}
          >
            Create key
          </Button>
          {newKey && (
            <p className="rounded-md bg-muted p-3 text-xs break-all">
              New key (copy now): <code>{newKey}</code>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {keys?.length === 0 && (
            <p className="text-sm text-muted-foreground">No API keys yet.</p>
          )}
          {keys?.map((key) => (
            <div
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
            >
              <div>
                <p className="font-medium">{key.name}</p>
                <p className="text-xs text-muted-foreground">
                  {key.keyPrefix}… · {key.scopes.join(', ')}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => revokeMutation.mutate(key.id)}
              >
                Revoke
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
