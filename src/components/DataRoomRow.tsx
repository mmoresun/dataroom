import { Database } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NodeActionsMenu } from '@/components/NodeActionsMenu';
import { useFocusHighlight } from '@/hooks/useFocusHighlight';
import { useIsTruncated } from '@/hooks/useIsTruncated';
import type { DataRoom } from '@/lib/db/schema';
import { formatDate } from '@/lib/format';

interface DataRoomRowProps {
  room: DataRoom;
  /** Direct child count, shown as "N items". Undefined while still loading. */
  itemCount: number | undefined;
  shouldFocus?: boolean;
  onFocusHandled?: () => void;
  onOpen: (room: DataRoom) => void;
  onRename: (room: DataRoom) => void;
  onDelete: (room: DataRoom) => void;
}

export function DataRoomRow({ room, itemCount, shouldFocus, onFocusHandled, onOpen, onRename, onDelete }: DataRoomRowProps) {
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
        onClick={() => onOpen(room)}
        aria-label={room.name}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <Database className="size-5 shrink-0 fill-amber-400/25 text-amber-500 dark:text-amber-400" aria-hidden="true" />
        {isTruncated ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span ref={nameRef} className="min-w-0 flex-1 truncate text-sm font-medium" aria-hidden="true">
                {room.name}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="start" className="max-w-80 break-words">
              {room.name}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span ref={nameRef} className="min-w-0 flex-1 truncate text-sm font-medium" aria-hidden="true">
            {room.name}
          </span>
        )}
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:block" aria-hidden="true">
          {itemCount !== undefined ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}
        </span>
        <span
          className="hidden w-36 shrink-0 text-right text-xs text-muted-foreground md:block"
          aria-hidden="true"
        >
          {formatDate(room.createdAt)}
        </span>
      </button>

      <NodeActionsMenu node={room} onRename={onRename} onDelete={onDelete} />
    </div>
  );
}
