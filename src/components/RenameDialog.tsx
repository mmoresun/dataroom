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
import { DuplicateNameError, RepositoryError } from '@/lib/store/repository';

interface RenameDialogProps<T extends { id: string; name: string }> {
  target: T | null;
  onOpenChange: (open: boolean) => void;
  onRename: (id: string, name: string) => Promise<unknown>;
  title: (target: T) => string;
}

/** Generic rename dialog — works for folders, files, and datarooms alike (anything with an id + name). */
export function RenameDialog<T extends { id: string; name: string }>({ target, onOpenChange, onRename, title }: RenameDialogProps<T>) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Keyed by target id so the form's local state resets whenever a different target is picked. */}
        {target && <RenameForm key={target.id} target={target} onOpenChange={onOpenChange} onRename={onRename} title={title} />}
      </DialogContent>
    </Dialog>
  );
}

function RenameForm<T extends { id: string; name: string }>({
  target,
  onOpenChange,
  onRename,
  title,
}: {
  target: T;
  onOpenChange: (open: boolean) => void;
  onRename: (id: string, name: string) => Promise<unknown>;
  title: (target: T) => string;
}) {
  const [name, setName] = useState(target.name);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onRename(target.id, name);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof RepositoryError ? err.message : 'Failed to rename.');
      if (err instanceof DuplicateNameError) {
        // Keep the dialog open so the user can try a different name, restoring the
        // original (not what they just typed, which is the name that collided).
        setName(target.name);
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
        <DialogTitle>{title(target)}</DialogTitle>
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
