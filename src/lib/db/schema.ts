export type NodeId = string;
export type DataRoomId = string;

export interface DataRoom {
  id: DataRoomId;
  name: string;
  createdAt: number;
  updatedAt: number;
}

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
