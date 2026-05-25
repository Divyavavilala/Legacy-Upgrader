import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useDeleteRepository } from '@/hooks/use-repositories';

export function DeleteRepositoryDialog({
  repositoryId,
  repositoryName,
}: {
  repositoryId: string;
  repositoryName: string;
}) {
  const [open, setOpen] = useState(false);
  const remove = useDeleteRepository();
  const navigate = useNavigate();

  function handleDelete() {
    remove.mutate(repositoryId, {
      onSuccess: () => {
        setOpen(false);
        navigate('/repositories');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete repository?</DialogTitle>
          <DialogDescription>
            This permanently removes <strong>{repositoryName}</strong> and all scan history. This
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={remove.isPending}>
            {remove.isPending ? 'Deleting…' : 'Delete repository'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
