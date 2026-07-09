import { DataRoomRow } from '@/components/DataRoomRow';
import { Skeleton } from '@/components/ui/skeleton';
import type { DataRoom, DataRoomId } from '@/lib/db/schema';

interface DataRoomListProps {
  rooms: DataRoom[];
  isLoading: boolean;
  error: string | null;
  itemCounts: Map<DataRoomId, number>;
  focusRoomId: DataRoomId | null;
  onFocusHandled: () => void;
  onOpen: (room: DataRoom) => void;
  onRename: (room: DataRoom) => void;
  onDelete: (room: DataRoom) => void;
}

/** The dataroom-list area: error/loading/empty states and the row list. */
export function DataRoomList({
  rooms,
  isLoading,
  error,
  itemCounts,
  focusRoomId,
  onFocusHandled,
  onOpen,
  onRename,
  onDelete,
}: DataRoomListProps) {
  return (
    <>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-0.5" aria-busy="true" aria-label="Loading datarooms">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
          <p>No datarooms yet.</p>
          <p>Create one to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {rooms.map((room) => (
            <DataRoomRow
              key={room.id}
              room={room}
              itemCount={itemCounts.get(room.id)}
              shouldFocus={room.id === focusRoomId}
              onFocusHandled={onFocusHandled}
              onOpen={onOpen}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  );
}

/** Placeholder row matching DataRoomRow's layout, shown in a stack while the list loads. */
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
