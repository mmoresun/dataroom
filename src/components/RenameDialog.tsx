import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DataRoomNode } from '@/lib/db/schema';
import { DuplicateNameError, RepositoryError } from '@/lib/store/repository';

interface RenameDialogProps {
  node: DataRoomNode | null;
  onOpenChange: (open: boolean) => void;
  onRename: (id: string, name: string) => Promise<unknown>;
}

export function RenameDialog({ node, onOpenChange, onRename }: RenameDialogProps) {
  return (
    <Dialog open={node !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Keyed by node id so the form's local state resets whenever a different node is targeted. */}
        {node && <RenameForm key={node.id} node={node} onOpenChange={onOpenChange} onRename={onRename} />}
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({
  node,
  onOpenChange,
  onRename,
}: {
  node: DataRoomNode;
  onOpenChange: (open: boolean) => void;
  onRename: (id: string, name: string) => Promise<unknown>;
}) {
  const [name, setName] = useState(node.name);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onRename(node.id, name);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof RepositoryError ? err.message : 'Failed to rename.');
      if (err instanceof DuplicateNameError) {
        // Keep the dialog open so the user can try a different name, restoring the
        // original (not what they just typed, which is the name that collided).
        setName(node.name);
      } else {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Rename {node.type === 'folder' ? 'folder' : 'file'}</DialogTitle>
      </DialogHeader>
      <div className="py-4">
        <Label htmlFor="rename-input" className="sr-only">
          Name
        </Label>
        <Input
          id="rename-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onFocus={(e) => e.target.select()}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={!name.trim() || isSubmitting}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
