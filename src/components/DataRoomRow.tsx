import { Database } from 'lucide-react';
import { NodeRowShell } from '@/components/NodeRowShell';
import type { DataRoom } from '@/lib/db/schema';

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
  return (
    <NodeRowShell
      node={room}
      icon={<Database className="size-5 shrink-0 fill-amber-400/25 text-amber-500 dark:text-amber-400" aria-hidden="true" />}
      metaText={itemCount !== undefined ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}
      shouldFocus={shouldFocus}
      onFocusHandled={onFocusHandled}
      onOpen={onOpen}
      onRename={onRename}
      onDelete={onDelete}
    />
  );
}
