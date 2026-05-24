import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateRepository } from '@/hooks/use-repositories';

export function AddRepositoryDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const create = useCreateRepository();

  function reset() {
    setName('');
    setSlug('');
    setGitUrl('');
    setDefaultBranch('main');
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slug) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      );
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      { name, slug, gitUrl, defaultBranch: defaultBranch || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          reset();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add repository</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add repository</DialogTitle>
          <DialogDescription>
            Register a Git remote URL to scan and generate modernization insights.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repo-name">Name</Label>
            <Input
              id="repo-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Legacy Frontend"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repo-slug">Slug</Label>
            <Input
              id="repo-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repo-url">Git URL</Label>
            <Input
              id="repo-url"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              placeholder="https://github.com/org/repo.git"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repo-branch">Default branch</Label>
            <Input
              id="repo-branch"
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? 'Adding…' : 'Add repository'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
