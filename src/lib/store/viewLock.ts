import type { NodeId } from '@/lib/db/schema';

/**
 * Cross-tab "in use" tracking via the Web Locks API. A tab holds a shared lock on a node
 * (a file open in the PDF viewer, or a folder currently being browsed) for as long as
 * that's true; the browser releases it automatically on tab close or crash, so there's
 * no heartbeat/cleanup bookkeeping to get wrong. Unsupported browsers (e.g. older Safari)
 * silently skip the check rather than block renames/deletes.
 */

function lockName(nodeId: NodeId): string {
  return `dataroom-node:${nodeId}`;
}

/** Call while a node is open (file in the viewer, or the folder currently being browsed); call the returned function when done. */
export function holdViewLock(nodeId: NodeId): () => void {
  if (!('locks' in navigator)) return () => {};

  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  void navigator.locks.request(lockName(nodeId), { mode: 'shared' }, () => held);
  return release;
}

/** True if some other tab currently holds a view lock on this node. */
export async function isOpenElsewhere(nodeId: NodeId): Promise<boolean> {
  if (!('locks' in navigator)) return false;

  const acquired = await navigator.locks.request(
    lockName(nodeId),
    { mode: 'exclusive', ifAvailable: true },
    (lock) => lock !== null,
  );
  return !acquired;
}
