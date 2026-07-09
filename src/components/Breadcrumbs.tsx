import { Fragment } from 'react';
import { ChevronRight } from 'lucide-react';
import type { DataRoomNode } from '@/lib/db/schema';

interface BreadcrumbsProps {
  path: DataRoomNode[];
  onNavigate: (folderId: string | null) => void;
}

export function Breadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="rounded px-1.5 py-1 font-medium text-foreground hover:bg-accent"
      >
        Dataroom
      </button>
      {path.map((node, index) => (
        <Fragment key={node.id}>
          <ChevronRight className="size-3.5 shrink-0" />
          <button
            type="button"
            onClick={() => onNavigate(node.id)}
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
