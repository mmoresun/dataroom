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
import { RepositoryError } from '@/lib/store/repository';

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => Promise<unknown>;
  title: string;
  label: string;
  defaultName: string;
  errorFallback: string;
}

/** Generic "create X" dialog — a name field pre-filled with a default, and a Create button. Used for both folders and datarooms. */
export function CreateDialog({ open, onOpenChange, onCreate, title, label, defaultName, errorFallback }: CreateDialogProps) {
  const [name, setName] = useState(defaultName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreate(name);
      onOpenChange(false);
      setName(defaultName);
    } catch (err) {
      toast.error(err instanceof RepositoryError ? err.message : errorFallback);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="create-name-input" className="sr-only">
              {label}
            </Label>
            <Input
              id="create-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
