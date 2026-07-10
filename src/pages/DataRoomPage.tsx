import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserMenu } from '@/components/UserMenu';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Toolbar } from '@/components/Toolbar';
import { NodeList } from '@/components/NodeList';
import { CreateDialog } from '@/components/CreateDialog';
import { RenameDialog } from '@/components/RenameDialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { PdfViewerDialog } from '@/components/PdfViewerDialog';
import { useDataRoom } from '@/hooks/useDataRoom';
import type { DataRoomNode, FileNode } from '@/lib/db/schema';
import { RepositoryError } from '@/lib/store/repository';
import { holdViewLock } from '@/lib/store/viewLock';

export function DataRoomPage() {
  const { roomId, id } = useParams<{ roomId: string; id?: string }>();
  const navigate = useNavigate();
  const folderId = id ?? roomId!;

  const room = useDataRoom(roomId!, folderId);

  const [isCreateFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DataRoomNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DataRoomNode | null>(null);
  const [viewFile, setViewFile] = useState<FileNode | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  // Hold a cross-tab "in use" lock on the dataroom itself, so another tab can't rename
  // or delete it while it's being browsed here (regardless of which folder within it).
  useEffect(() => holdViewLock(roomId!), [roomId]);

  // Hold a cross-tab "in use" lock on the folder currently being browsed, so another
  // tab can't rename or delete it out from under this one. The room's own root is
  // virtual (never stored as a node, can't be renamed/deleted as a node), so there's
  // nothing extra to lock for it beyond the room-level lock above.
  useEffect(() => {
    if (folderId === roomId) return;
    return holdViewLock(folderId);
  }, [folderId, roomId]);

  // The dataroom or folder we're pointed at (via a stale bookmark, browser history, or
  // another tab deleting it) may no longer exist. Bounce to the room's root (folder gone)
  // or all the way to the dataroom list (room itself gone) rather than silently rendering
  // an empty listing with a broken breadcrumb. Guarded with a ref (not just the dependency
  // array) because React StrictMode re-invokes effects on every commit in development,
  // which would otherwise fire this toast/navigate twice.
  const hasHandledNotFound = useRef(false);
  useEffect(() => {
    if (!room.roomNotFound && !room.notFound) {
      hasHandledNotFound.current = false;
      return;
    }
    if (hasHandledNotFound.current) return;
    hasHandledNotFound.current = true;
    if (room.roomNotFound) {
      toast.error('This dataroom no longer exists.');
      navigate('/', { replace: true });
    } else {
      toast.error('This folder no longer exists.');
      navigate(`/room/${roomId}`, { replace: true });
    }
  }, [room.roomNotFound, room.notFound, navigate, roomId]);

  const handleOpen = (node: DataRoomNode) => {
    if (node.type === 'folder') navigate(`/room/${roomId}/folder/${node.id}`);
    else setViewFile(node);
  };

  const handleUploadFiles = async (files: FileList) => {
    const list = Array.from(files);
    let uploaded = 0;
    const skipped: string[] = [];

    for (const file of list) {
      try {
        const created = await room.uploadFile(file);
        uploaded += 1;
        if (created.name !== file.name) {
          toast.info(`"${file.name}" already existed here, saved as "${created.name}"`);
        }
      } catch (err) {
        skipped.push(err instanceof RepositoryError ? `${file.name}: ${err.message}` : file.name);
      }
    }

    if (uploaded > 0) toast.success(uploaded === 1 ? 'File uploaded' : `${uploaded} files uploaded`);
    skipped.forEach((message) => toast.error(`Skipped ${message}`));
  };

  const handleCreateFolder = async (name: string) => {
    const folder = await room.createFolder(name);
    setFocusNodeId(folder.id);
  };

  const handleRename = async (nodeId: string, name: string) => {
    const updated = await room.renameNode(nodeId, name);
    setFocusNodeId(updated.id);
  };

  const handleDelete = async (nodeId: string) => {
    const node = deleteTarget;
    setDeleteTarget(null);
    try {
      await room.deleteNode(nodeId);
      toast.success(node?.type === 'folder' ? 'Folder deleted' : 'File deleted');
    } catch (err) {
      toast.error(err instanceof RepositoryError ? err.message : 'Failed to delete.');
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col p-4 sm:p-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{room.roomName ?? 'Dataroom'}</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          roomName={room.roomName ?? ''}
          path={room.breadcrumb}
          onNavigateHome={() => navigate('/')}
          onNavigateRoom={() => navigate(`/room/${roomId}`)}
          onNavigateFolder={(fid) => navigate(`/room/${roomId}/folder/${fid}`)}
        />
        <Toolbar
          onCreateFolderClick={() => setCreateFolderOpen(true)}
          onFilesSelected={(files) => void handleUploadFiles(files)}
        />
      </div>

      <NodeList
        nodes={room.children}
        isLoading={room.isLoading}
        error={room.error}
        folderItemCounts={room.folderItemCounts}
        focusNodeId={focusNodeId}
        onFocusHandled={() => setFocusNodeId(null)}
        onOpen={handleOpen}
        onRename={setRenameTarget}
        onDelete={setDeleteTarget}
        onFilesDropped={(files) => void handleUploadFiles(files)}
      />

      <CreateDialog
        open={isCreateFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onCreate={handleCreateFolder}
        title="New folder"
        label="Folder name"
        defaultName="New Folder"
        errorFallback="Failed to create folder."
      />
      <RenameDialog
        target={renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        onRename={handleRename}
        title={(node) => `Rename ${node.type === 'folder' ? 'folder' : 'file'}`}
      />
      <DeleteConfirmDialog
        target={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={(node) => `Delete ${node.type === 'folder' ? 'folder' : 'file'}?`}
        isContainer={(node) => node.type === 'folder'}
        getDataRoomId={() => roomId!}
      />
      <PdfViewerDialog file={viewFile} onOpenChange={(open) => !open && setViewFile(null)} />
    </div>
  );
}
