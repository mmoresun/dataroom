import { useState, type DragEvent } from 'react';
import { NodeRow } from '@/components/NodeRow';
import { Skeleton } from '@/components/ui/skeleton';
import type { DataRoomNode, NodeId } from '@/lib/db/schema';

interface NodeListProps {
  nodes: DataRoomNode[];
  isLoading: boolean;
  error: string | null;
  folderItemCounts: Map<NodeId, number>;
  focusNodeId: NodeId | null;
  onFocusHandled: () => void;
  onOpen: (node: DataRoomNode) => void;
  onRename: (node: DataRoomNode) => void;
  onDelete: (node: DataRoomNode) => void;
  onFilesDropped: (files: FileList) => void;
}

/** The folder-contents area: error/loading/empty states, the row list, and drag-and-drop upload. */
export function NodeList({
  nodes,
  isLoading,
  error,
  folderItemCounts,
  focusNodeId,
  onFocusHandled,
  onOpen,
  onRename,
  onDelete,
  onFilesDropped,
}: NodeListProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files.length > 0) onFilesDropped(e.dataTransfer.files);
  };

  return (
    <>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
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
        {isLoading ? (
          <div className="flex flex-col gap-0.5" aria-busy="true" aria-label="Loading folder contents">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
            <p>This folder is empty.</p>
            <p>Drop a PDF here, or use the buttons above to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {nodes.map((node) => (
              <NodeRow
                key={node.id}
                node={node}
                itemCount={node.type === 'folder' ? folderItemCounts.get(node.id) : undefined}
                shouldFocus={node.id === focusNodeId}
                onFocusHandled={onFocusHandled}
                onOpen={onOpen}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/** Placeholder row matching NodeRow's layout, shown in a stack while a folder's contents load. */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5">
      <Skeleton className="size-5 shrink-0 rounded" />
      <Skeleton className="h-4 max-w-64 flex-1 min-w-24" />
      <Skeleton className="hidden h-3 w-12 shrink-0 sm:block" />
      <Skeleton className="hidden h-3 w-24 shrink-0 md:block" />
      <Skeleton className="ml-auto size-8 shrink-0 rounded-md" />
    </div>
  );
}
