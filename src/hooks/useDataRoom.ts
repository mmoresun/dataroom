import { useCallback, useEffect, useState } from 'react';
import type { DataRoomNode, NodeId } from '@/lib/db/schema';
import { ROOT_ID } from '@/lib/db/schema';
import * as repo from '@/lib/store/repository';

/**
 * Loads and mutates the contents of a single folder. Re-fetches from IndexedDB
 * after every mutation rather than patching local state, since this is a thin
 * mock layer and correctness matters more than avoiding a re-read.
 */
export function useDataRoom(folderId: NodeId = ROOT_ID) {
  const [children, setChildren] = useState<DataRoomNode[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<DataRoomNode[]>([]);
  const [folderItemCounts, setFolderItemCounts] = useState<Map<NodeId, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // True once we've confirmed folderId doesn't exist anymore (e.g. deleted from
  // another tab, then revisited via a stale bookmark/back-button/history entry).
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      if (folderId !== ROOT_ID && !(await repo.getNode(folderId))) {
        setNotFound(true);
        setChildren([]);
        setBreadcrumb([]);
        setFolderItemCounts(new Map());
        setError(null);
        return;
      }
      setNotFound(false);

      const [nextChildren, nextBreadcrumb] = await Promise.all([
        repo.listChildren(folderId),
        repo.getBreadcrumb(folderId),
      ]);
      setChildren(nextChildren);
      setBreadcrumb(nextBreadcrumb);
      setError(null);

      const folders = nextChildren.filter((n) => n.type === 'folder');
      const counts = await Promise.all(folders.map((f) => repo.countChildren(f.id)));
      setFolderItemCounts(new Map(folders.map((f, i) => [f.id, counts[i]])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folder.');
    } finally {
      setIsLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    // Fetch-on-mount/folder-change pattern: refresh() sets isLoading synchronously
    // before its first await, which the compiler lint flags defensively.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  // Mutations don't set `error` on failure: each caller already surfaces its own
  // toast with a more specific message, so a shared banner would just repeat it.
  const runMutation = useCallback(
    async <T,>(mutation: () => Promise<T>): Promise<T> => {
      const result = await mutation();
      await refresh();
      return result;
    },
    [refresh],
  );

  return {
    children,
    breadcrumb,
    folderItemCounts,
    isLoading,
    error,
    notFound,
    createFolder: (name: string) => runMutation(() => repo.createFolder(name, folderId)),
    uploadFile: (file: File) => runMutation(() => repo.uploadFile(file, folderId)),
    renameNode: (id: NodeId, newName: string) => runMutation(() => repo.renameNode(id, newName)),
    deleteNode: (id: NodeId) => runMutation(() => repo.deleteNode(id)),
  };
}
