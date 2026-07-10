import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { folderWarning } from '@/lib/format';
import { listChildren } from '@/lib/store/repository';

interface DeleteConfirmDialogProps<T extends { id: string; name: string }> {
  target: T | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => void;
  title: (target: T) => string;
  /** True if `target` can itself contain files/folders (a folder or a dataroom) — its nested
   * item counts are fetched and shown in the warning. False for a leaf item (a file). */
  isContainer: (target: T) => boolean;
  /** Id of the dataroom `target` lives in — itself, if `target` is a dataroom. Only read
   * when `isContainer(target)` is true. */
  getDataRoomId: (target: T) => string;
}

/** Generic delete-confirmation dialog — works for folders, files, and datarooms alike. */
export function DeleteConfirmDialog<T extends { id: string; name: string }>({
  target,
  onOpenChange,
  onConfirm,
  title,
  isContainer,
  getDataRoomId,
}: DeleteConfirmDialogProps<T>) {
  return (
    <AlertDialog open={target !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {/* Keyed by target id so child-count state resets fresh whenever a different target is picked. */}
        {target && (
          <DeleteConfirmBody
            key={target.id}
            target={target}
            onConfirm={onConfirm}
            title={title}
            isContainer={isContainer}
            getDataRoomId={getDataRoomId}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteConfirmBody<T extends { id: string; name: string }>({
  target,
  onConfirm,
  title,
  isContainer,
  getDataRoomId,
}: {
  target: T;
  onConfirm: (id: string) => void;
  title: (target: T) => string;
  isContainer: (target: T) => boolean;
  getDataRoomId: (target: T) => string;
}) {
  const [counts, setCounts] = useState<{ fileCount: number; folderCount: number } | null>(null);
  const container = isContainer(target);

  useEffect(() => {
    if (!container) return;
    let cancelled = false;
    void listChildren(getDataRoomId(target), target.id).then((children) => {
      if (cancelled) return;
      setCounts({
        fileCount: children.filter((c) => c.type === 'file').length,
        folderCount: children.filter((c) => c.type === 'folder').length,
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remounted per target.id (keyed by the parent)
  }, [target.id, container]);

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{title(target)}</AlertDialogTitle>
        <AlertDialogDescription>
          {container
            ? counts && folderWarning(target.name, counts.fileCount, counts.folderCount)
            : `"${target.name}" will be permanently deleted. This can't be undone.`}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={() => onConfirm(target.id)}
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
