import { useCallback, useEffect, useState } from 'react';
import type { DataRoom, DataRoomId } from '@/lib/db/schema';
import * as repo from '@/lib/store/repository';

/** Loads and mutates the list of top-level datarooms. Mirrors useDataRoom's refresh-after-mutation shape. */
export function useDataRoomList() {
  const [rooms, setRooms] = useState<DataRoom[]>([]);
  const [itemCounts, setItemCounts] = useState<Map<DataRoomId, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await repo.listDataRooms();
      setRooms(next);
      const counts = await Promise.all(next.map((r) => repo.countDataRoomChildren(r.id)));
      setItemCounts(new Map(next.map((r, i) => [r.id, counts[i]])));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load datarooms.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const runMutation = useCallback(
    async <T,>(mutation: () => Promise<T>): Promise<T> => {
      const result = await mutation();
      await refresh();
      return result;
    },
    [refresh],
  );

  return {
    rooms,
    itemCounts,
    isLoading,
    error,
    createDataRoom: (name: string) => runMutation(() => repo.createDataRoom(name)),
    renameDataRoom: (id: DataRoomId, name: string) => runMutation(() => repo.renameDataRoom(id, name)),
    deleteDataRoom: (id: DataRoomId) => runMutation(() => repo.deleteDataRoom(id)),
  };
}
