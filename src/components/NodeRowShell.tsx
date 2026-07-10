import type { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NodeActionsMenu } from '@/components/NodeActionsMenu';
import { useFocusHighlight } from '@/hooks/useFocusHighlight';
import { useIsTruncated } from '@/hooks/useIsTruncated';
import { formatDate } from '@/lib/format';

interface NodeRowShellProps<T extends { name: string; createdAt: number }> {
  node: T;
  icon: ReactNode;
  /** Right-aligned-ish meta text shown before the date column, e.g. "12 items" or "1.2 MB". */
  metaText: string;
  /** True right after this node was created or renamed, so it can grab focus and flash once. */
  shouldFocus?: boolean;
  /** Called once shouldFocus has been acted on, so the parent can reset it. */
  onFocusHandled?: () => void;
  onOpen: (node: T) => void;
  onRename: (node: T) => void;
  onDelete: (node: T) => void;
}

/** Shared row chrome (container, icon slot, truncated-name tooltip, meta/date columns, actions menu) used by FolderRow, FileRow, and DataRoomRow. */
export function NodeRowShell<T extends { name: string; createdAt: number }>({
  node,
  icon,
  metaText,
  shouldFocus,
  onFocusHandled,
  onOpen,
  onRename,
  onDelete,
}: NodeRowShellProps<T>) {
  const { ref: openButtonRef, isHighlighted } = useFocusHighlight<HTMLButtonElement>(shouldFocus, onFocusHandled);
  const { ref: nameRef, isTruncated } = useIsTruncated<HTMLSpanElement>();

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
        {icon}
        {isTruncated ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span ref={nameRef} className="min-w-0 flex-1 truncate text-sm font-medium" aria-hidden="true">
                {node.name}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="start" className="max-w-80 break-words">
              {node.name}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span ref={nameRef} className="min-w-0 flex-1 truncate text-sm font-medium" aria-hidden="true">
            {node.name}
          </span>
        )}
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:block" aria-hidden="true">
          {metaText}
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
