import { Folder } from 'lucide-react';
import { NodeRowShell } from '@/components/NodeRowShell';
import type { FolderNode } from '@/lib/db/schema';

interface FolderRowProps {
  node: FolderNode;
  /** Direct child count, shown as "N items". Undefined while still loading. */
  itemCount: number | undefined;
  shouldFocus?: boolean;
  onFocusHandled?: () => void;
  onOpen: (node: FolderNode) => void;
  onRename: (node: FolderNode) => void;
  onDelete: (node: FolderNode) => void;
}

export function FolderRow({ node, itemCount, shouldFocus, onFocusHandled, onOpen, onRename, onDelete }: FolderRowProps) {
  return (
    <NodeRowShell
      node={node}
      icon={<Folder className="size-5 shrink-0 fill-amber-400/25 text-amber-500 dark:text-amber-400" aria-hidden="true" />}
      metaText={itemCount !== undefined ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}
      shouldFocus={shouldFocus}
      onFocusHandled={onFocusHandled}
      onOpen={onOpen}
      onRename={onRename}
      onDelete={onDelete}
    />
  );
}
