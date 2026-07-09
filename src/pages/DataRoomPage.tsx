import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Toolbar } from '@/components/Toolbar';
import { NodeList } from '@/components/NodeList';
import { CreateFolderDialog } from '@/components/CreateFolderDialog';
import { RenameDialog } from '@/components/RenameDialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { PdfViewerDialog } from '@/components/PdfViewerDialog';
import { useDataRoom } from '@/hooks/useDataRoom';
import { ROOT_ID, type DataRoomNode, type FileNode } from '@/lib/db/schema';
import { RepositoryError } from '@/lib/store/repository';
import { holdViewLock } from '@/lib/store/viewLock';

export function DataRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const folderId = id ?? ROOT_ID;

  const room = useDataRoom(folderId);

  const [isCreateFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DataRoomNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DataRoomNode | null>(null);
  const [viewFile, setViewFile] = useState<FileNode | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  // Hold a cross-tab "in use" lock on the folder currently being browsed, so another
  // tab can't rename or delete it out from under this one. ROOT_ID is virtual (never
  // stored, can't be renamed/deleted), so there's nothing to lock for it.
  useEffect(() => {
    if (folderId === ROOT_ID) return;
    return holdViewLock(folderId);
  }, [folderId]);

  // The folder we're pointed at (via a stale bookmark, browser history, or another
  // tab deleting it) may no longer exist. Bounce to the root rather than silently
  // rendering an empty listing with a broken breadcrumb. Guarded with a ref (not just
  // the dependency array) because React StrictMode re-invokes effects on every commit
  // in development, which would otherwise fire this toast/navigate twice.
  const hasHandledNotFound = useRef(false);
  useEffect(() => {
    if (!room.notFound) {
      hasHandledNotFound.current = false;
      return;
    }
    if (hasHandledNotFound.current) return;
    hasHandledNotFound.current = true;
    toast.error('This folder no longer exists.');
    navigate('/', { replace: true });
  }, [room.notFound, navigate]);

  const handleOpen = (node: DataRoomNode) => {
    if (node.type === 'folder') navigate(`/folder/${node.id}`);
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
        <h1 className="text-2xl font-semibold">Dataroom</h1>
        <ThemeToggle />
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          path={room.breadcrumb}
          onNavigate={(fid) => navigate(fid ? `/folder/${fid}` : '/')}
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

      <CreateFolderDialog
        open={isCreateFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onCreate={handleCreateFolder}
      />
      <RenameDialog
        node={renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        onRename={handleRename}
      />
      <DeleteConfirmDialog
        node={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      <PdfViewerDialog file={viewFile} onOpenChange={(open) => !open && setViewFile(null)} />
    </div>
  );
}
