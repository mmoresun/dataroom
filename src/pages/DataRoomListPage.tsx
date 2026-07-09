import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { DataRoomList } from '@/components/DataRoomList';
import { CreateDataRoomDialog } from '@/components/CreateDataRoomDialog';
import { RenameDataRoomDialog } from '@/components/RenameDataRoomDialog';
import { DeleteDataRoomConfirmDialog } from '@/components/DeleteDataRoomConfirmDialog';
import { useDataRoomList } from '@/hooks/useDataRoomList';
import type { DataRoom } from '@/lib/db/schema';
import { RepositoryError } from '@/lib/store/repository';

export function DataRoomListPage() {
  const navigate = useNavigate();
  const list = useDataRoomList();

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DataRoom | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DataRoom | null>(null);
  const [focusRoomId, setFocusRoomId] = useState<string | null>(null);

  const handleOpen = (room: DataRoom) => navigate(`/room/${room.id}`);

  const handleCreate = async (name: string) => {
    const room = await list.createDataRoom(name);
    setFocusRoomId(room.id);
  };

  const handleRename = async (id: string, name: string) => {
    const updated = await list.renameDataRoom(id, name);
    setFocusRoomId(updated.id);
  };

  const handleDelete = async (id: string) => {
    setDeleteTarget(null);
    try {
      await list.deleteDataRoom(id);
      toast.success('Dataroom deleted');
    } catch (err) {
      toast.error(err instanceof RepositoryError ? err.message : 'Failed to delete.');
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col p-4 sm:p-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Datarooms</h1>
        <ThemeToggle />
      </header>

      <div className="mb-4 flex justify-end">
        <Button variant="outline" onClick={() => setCreateOpen(true)}>
          <FolderPlus className="size-4" />
          New dataroom
        </Button>
      </div>

      <DataRoomList
        rooms={list.rooms}
        isLoading={list.isLoading}
        error={list.error}
        itemCounts={list.itemCounts}
        focusRoomId={focusRoomId}
        onFocusHandled={() => setFocusRoomId(null)}
        onOpen={handleOpen}
        onRename={setRenameTarget}
        onDelete={setDeleteTarget}
      />

      <CreateDataRoomDialog open={isCreateOpen} onOpenChange={setCreateOpen} onCreate={handleCreate} />
      <RenameDataRoomDialog
        room={renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        onRename={handleRename}
      />
      <DeleteDataRoomConfirmDialog
        room={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
