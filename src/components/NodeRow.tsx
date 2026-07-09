import { FileText, Folder } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NodeActionsMenu } from '@/components/NodeActionsMenu';
import { useFocusHighlight } from '@/hooks/useFocusHighlight';
import type { DataRoomNode } from '@/lib/db/schema';
import { formatBytes, formatDate } from '@/lib/format';

interface NodeRowProps {
  node: DataRoomNode;
  /** Direct child count, only meaningful (and passed) when node.type === 'folder'. */
  itemCount?: number;
  /** True right after this node was created or renamed, so it can grab focus and flash once. */
  shouldFocus?: boolean;
  /** Called once shouldFocus has been acted on, so the parent can reset it. */
  onFocusHandled?: () => void;
  onOpen: (node: DataRoomNode) => void;
  onRename: (node: DataRoomNode) => void;
  onDelete: (node: DataRoomNode) => void;
}

export function NodeRow({ node, itemCount, shouldFocus, onFocusHandled, onOpen, onRename, onDelete }: NodeRowProps) {
  const { ref: openButtonRef, isHighlighted } = useFocusHighlight<HTMLButtonElement>(shouldFocus, onFocusHandled);

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-100 ${
        isHighlighted ? 'border-primary/40 bg-accent' : 'border-transparent hover:border-border hover:bg-accent/50'
      }`}
    >
      <button
        ref={openButtonRef}
        type="button"
        onClick={() => onOpen(node)}
        aria-label={node.name}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        {node.type === 'folder' ? (
          <Folder className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="min-w-0 flex-1 truncate text-sm font-medium" aria-hidden="true">
              {node.name}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" align="start" className="max-w-80 break-words">
            {node.name}
          </TooltipContent>
        </Tooltip>
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:block" aria-hidden="true">
          {node.type === 'file'
            ? formatBytes(node.size)
            : itemCount !== undefined
              ? `${itemCount} item${itemCount === 1 ? '' : 's'}`
              : ''}
        </span>
        <span
          className="hidden w-36 shrink-0 text-right text-xs text-muted-foreground md:block"
          aria-hidden="true"
        >
          {formatDate(node.createdAt)}
        </span>
      </button>

      <NodeActionsMenu node={node} onRename={onRename} onDelete={onDelete} />
    </div>
  );
}
