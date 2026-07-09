export type NodeId = string;

/** Virtual root folder. Never stored as a node — just the parentId sentinel for top-level items. */
export const ROOT_ID: NodeId = 'root';

interface BaseNode {
  id: NodeId;
  name: string;
  parentId: NodeId;
  createdAt: number;
  updatedAt: number;
}

export interface FolderNode extends BaseNode {
  type: 'folder';
}

export interface FileNode extends BaseNode {
  type: 'file';
  size: number;
  mimeType: string;
}

export type DataRoomNode = FolderNode | FileNode;
