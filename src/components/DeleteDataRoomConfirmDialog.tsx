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
import type { DataRoom } from '@/lib/db/schema';
import { folderWarning } from '@/lib/format';
import { listChildren } from '@/lib/store/repository';

interface DeleteDataRoomConfirmDialogProps {
  room: DataRoom | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => void;
}

export function DeleteDataRoomConfirmDialog({ room, onOpenChange, onConfirm }: DeleteDataRoomConfirmDialogProps) {
  return (
    <AlertDialog open={room !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {/* Keyed by room id so child-count state resets fresh whenever a different room is targeted. */}
        {room && <DeleteConfirmBody key={room.id} room={room} onConfirm={onConfirm} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteConfirmBody({ room, onConfirm }: { room: DataRoom; onConfirm: (id: string) => void }) {
  const [counts, setCounts] = useState<{ fileCount: number; folderCount: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listChildren(room.id).then((children) => {
      if (cancelled) return;
      setCounts({
        fileCount: children.filter((c) => c.type === 'file').length,
        folderCount: children.filter((c) => c.type === 'folder').length,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete dataroom?</AlertDialogTitle>
        <AlertDialogDescription>
          {counts && folderWarning(room.name, counts.fileCount, counts.folderCount)}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={() => onConfirm(room.id)}
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
