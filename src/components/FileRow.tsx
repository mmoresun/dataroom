import { FileText } from 'lucide-react';
import { NodeRowShell } from '@/components/NodeRowShell';
import type { FileNode } from '@/lib/db/schema';
import { formatBytes } from '@/lib/format';

interface FileRowProps {
  node: FileNode;
  shouldFocus?: boolean;
  onFocusHandled?: () => void;
  onOpen: (node: FileNode) => void;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
}

export function FileRow({ node, shouldFocus, onFocusHandled, onOpen, onRename, onDelete }: FileRowProps) {
  return (
    <NodeRowShell
      node={node}
      icon={<FileText className="size-5 shrink-0 fill-red-400/15 text-red-500 dark:text-red-400" aria-hidden="true" />}
      metaText={formatBytes(node.size)}
      shouldFocus={shouldFocus}
      onFocusHandled={onFocusHandled}
      onOpen={onOpen}
      onRename={onRename}
      onDelete={onDelete}
    />
  );
}
