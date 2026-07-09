import { Fragment } from 'react';
import { ChevronRight } from 'lucide-react';
import type { DataRoomNode } from '@/lib/db/schema';

interface BreadcrumbsProps {
  roomName: string;
  path: DataRoomNode[];
  onNavigateHome: () => void;
  onNavigateRoom: () => void;
  onNavigateFolder: (folderId: string) => void;
}

export function Breadcrumbs({ roomName, path, onNavigateHome, onNavigateRoom, onNavigateFolder }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
      <button
        type="button"
        onClick={onNavigateHome}
        className="rounded px-1.5 py-1 hover:bg-accent"
      >
        All Datarooms
      </button>
      <ChevronRight className="size-3.5 shrink-0" />
      <button
        type="button"
        onClick={onNavigateRoom}
        disabled={path.length === 0}
        className="max-w-50 truncate rounded px-1.5 py-1 hover:bg-accent disabled:pointer-events-none disabled:font-medium disabled:text-foreground"
        title={roomName}
      >
        {roomName}
      </button>
      {path.map((node, index) => (
        <Fragment key={node.id}>
          <ChevronRight className="size-3.5 shrink-0" />
          <button
            type="button"
            onClick={() => onNavigateFolder(node.id)}
            disabled={index === path.length - 1}
            className="max-w-50 truncate rounded px-1.5 py-1 hover:bg-accent disabled:pointer-events-none disabled:font-medium disabled:text-foreground"
            title={node.name}
          >
            {node.name}
          </button>
        </Fragment>
      ))}
    </nav>
  );
}
