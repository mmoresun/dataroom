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
import type { DataRoomNode } from '@/lib/db/schema';
import { listChildren } from '@/lib/store/repository';

interface DeleteConfirmDialogProps {
  node: DataRoomNode | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => void;
}

function folderWarning(name: string, fileCount: number, folderCount: number): string {
  if (fileCount === 0 && folderCount === 0) {
    return `"${name}" and everything inside it will be permanently deleted. This can't be undone.`;
  }
  const parts = [
    fileCount > 0 ? `${fileCount} file${fileCount === 1 ? '' : 's'}` : null,
    folderCount > 0 ? `${folderCount} folder${folderCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean);
  return `"${name}" contains ${parts.join(' and ')} at the top level. Everything inside — including anything nested deeper — will be permanently deleted. This can't be undone.`;
}

export function DeleteConfirmDialog({ node, onOpenChange, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={node !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {/* Keyed by node id so child-count state resets fresh whenever a different node is targeted. */}
        {node && <DeleteConfirmBody key={node.id} node={node} onConfirm={onConfirm} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteConfirmBody({ node, onConfirm }: { node: DataRoomNode; onConfirm: (id: string) => void }) {
  const [counts, setCounts] = useState<{ fileCount: number; folderCount: number } | null>(null);

  useEffect(() => {
    if (node.type !== 'folder') return;
    let cancelled = false;
    void listChildren(node.id).then((children) => {
      if (cancelled) return;
      setCounts({
        fileCount: children.filter((c) => c.type === 'file').length,
        folderCount: children.filter((c) => c.type === 'folder').length,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [node.id, node.type]);

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete {node.type === 'folder' ? 'folder' : 'file'}?</AlertDialogTitle>
        <AlertDialogDescription>
          {node.type === 'folder'
            ? counts && folderWarning(node.name, counts.fileCount, counts.folderCount)
            : `"${node.name}" will be permanently deleted. This can't be undone.`}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={() => onConfirm(node.id)}
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
