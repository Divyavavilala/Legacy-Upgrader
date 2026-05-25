import { GitBranch, Plus } from 'lucide-react';
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

export function AddRepositoryDialog({ triggerClassName }: { triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [gitUrl, setGitUrl] = useState('');
  const [name, setName] = useState('');
  const create = useCreateRepository();

  function reset() {
    setGitUrl('');
    setName('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      { gitUrl, name: name.trim() || undefined },
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
        <Button
          className={
            triggerClassName ??
            'bg-gradient-to-r from-primary to-cyan text-primary-foreground shadow-[0_0_20px_oklch(0.72_0.19_285/0.35)] hover:opacity-90'
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Add repository
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/80 bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Modernize a legacy repo
          </DialogTitle>
          <DialogDescription>
            Paste a public Git URL — we detect the name, default branch, and provider automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repo-url">Repository URL</Label>
            <Input
              id="repo-url"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              placeholder="https://github.com/facebook/react"
              className="font-mono text-sm"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repo-name">
              Display name <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="repo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Auto-detected from URL"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-cyan"
            disabled={create.isPending}
          >
            {create.isPending ? 'Adding…' : 'Add & prepare scan'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
