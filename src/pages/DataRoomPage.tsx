import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';
import { FolderPlus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { NodeRow } from '@/components/NodeRow';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCreateFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DataRoomNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DataRoomNode | null>(null);
  const [viewFile, setViewFile] = useState<FileNode | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  // Hold a cross-tab "in use" lock on the folder currently being browsed, so another
  // tab can't rename or delete it out from under this one. ROOT_ID is virtual (never
  // stored, can't be renamed/deleted), so there's nothing to lock for it.
  useEffect(() => {
    if (folderId === ROOT_ID) return;
    return holdViewLock(folderId);
  }, [folderId]);

  const handleOpen = (node: DataRoomNode) => {
    if (node.type === 'folder') navigate(`/folder/${node.id}`);
    else setViewFile(node);
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
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

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files.length > 0) void handleUploadFiles(e.dataTransfer.files);
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus className="size-4" />
            New folder
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-4" />
            Upload PDF
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void handleUploadFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {room.error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {room.error}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={`min-h-64 flex-1 rounded-lg border-2 border-dashed p-2 transition-colors ${
          isDraggingOver ? 'border-primary bg-accent/50' : 'border-transparent'
        }`}
      >
        {room.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : room.children.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
            <p>This folder is empty.</p>
            <p>Drop a PDF here, or use the buttons above to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {room.children.map((node) => (
              <NodeRow
                key={node.id}
                node={node}
                itemCount={node.type === 'folder' ? room.folderItemCounts.get(node.id) : undefined}
                shouldFocus={node.id === focusNodeId}
                onFocusHandled={() => setFocusNodeId(null)}
                onOpen={handleOpen}
                onRename={setRenameTarget}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

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
