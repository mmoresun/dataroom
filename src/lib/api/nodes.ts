import { apiFetch } from '@/lib/api/client';
import type { DataRoom, DataRoomId, DataRoomNode, FileNode, FolderNode, NodeId } from '@/lib/db/schema';

interface RawDataRoom {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface RawNode {
  id: string;
  type: 'folder' | 'file';
  name: string;
  parentId: string;
  size?: number | null;
  mimeType?: string | null;
  createdAt: string;
  updatedAt: string;
}

// The backend sends createdAt/updatedAt as ISO date strings; the rest of this app
// (formatDate, sorting, etc.) works with epoch-ms numbers, so that conversion happens
// once here rather than leaking the backend's wire format into the rest of the app.
function mapDataRoom(raw: RawDataRoom): DataRoom {
  return {
    id: raw.id,
    name: raw.name,
    createdAt: new Date(raw.createdAt).getTime(),
    updatedAt: new Date(raw.updatedAt).getTime(),
  };
}

function mapNode(raw: RawNode): DataRoomNode {
  const base = {
    id: raw.id,
    name: raw.name,
    parentId: raw.parentId,
    createdAt: new Date(raw.createdAt).getTime(),
    updatedAt: new Date(raw.updatedAt).getTime(),
  };
  if (raw.type === 'folder') return { ...base, type: 'folder' } satisfies FolderNode;
  return {
    ...base,
    type: 'file',
    size: raw.size ?? 0,
    mimeType: raw.mimeType ?? 'application/pdf',
  } satisfies FileNode;
}

export async function listDataRooms(): Promise<DataRoom[]> {
  const rooms = await apiFetch<RawDataRoom[]>('/data-rooms');
  return rooms.map(mapDataRoom);
}

export async function getDataRoom(id: DataRoomId): Promise<DataRoom> {
  return mapDataRoom(await apiFetch<RawDataRoom>(`/data-rooms/${id}`));
}

export async function createDataRoom(name: string): Promise<DataRoom> {
  return mapDataRoom(await apiFetch<RawDataRoom>('/data-rooms', { method: 'POST', body: { name } }));
}

export async function renameDataRoom(id: DataRoomId, name: string): Promise<DataRoom> {
  return mapDataRoom(await apiFetch<RawDataRoom>(`/data-rooms/${id}`, { method: 'PATCH', body: { name } }));
}

export async function deleteDataRoom(id: DataRoomId): Promise<void> {
  await apiFetch(`/data-rooms/${id}`, { method: 'DELETE' });
}

export async function countDataRoomChildren(id: DataRoomId): Promise<number> {
  const { count } = await apiFetch<{ count: number }>(`/data-rooms/${id}/children-count`);
  return count;
}

export async function listChildren(dataRoomId: DataRoomId, parentId: NodeId): Promise<DataRoomNode[]> {
  const nodes = await apiFetch<RawNode[]>(
    `/nodes?dataRoomId=${encodeURIComponent(dataRoomId)}&parentId=${encodeURIComponent(parentId)}`,
  );
  return nodes.map(mapNode);
}

export async function getNode(id: NodeId): Promise<DataRoomNode> {
  return mapNode(await apiFetch<RawNode>(`/nodes/${id}`));
}

export async function countChildren(id: NodeId): Promise<number> {
  const { count } = await apiFetch<{ count: number }>(`/nodes/${id}/children-count`);
  return count;
}

export async function getBreadcrumb(id: NodeId, rootId: DataRoomId): Promise<DataRoomNode[]> {
  const nodes = await apiFetch<RawNode[]>(`/nodes/${id}/breadcrumb?rootId=${encodeURIComponent(rootId)}`);
  return nodes.map(mapNode);
}

export async function createFolder(name: string, parentId: NodeId, dataRoomId: DataRoomId): Promise<FolderNode> {
  return mapNode(
    await apiFetch<RawNode>('/nodes/folders', { method: 'POST', body: { name, parentId, dataRoomId } }),
  ) as FolderNode;
}

export async function renameNode(id: NodeId, name: string): Promise<DataRoomNode> {
  return mapNode(await apiFetch<RawNode>(`/nodes/${id}`, { method: 'PATCH', body: { name } }));
}

export async function deleteNode(id: NodeId): Promise<void> {
  await apiFetch(`/nodes/${id}`, { method: 'DELETE' });
}

export async function requestUpload(
  fileName: string,
  fileSize: number,
  mimeType: string,
  parentId: NodeId,
  dataRoomId: DataRoomId,
): Promise<{ fileId: NodeId; uploadUrl: string }> {
  return apiFetch('/nodes/upload-requests', {
    method: 'POST',
    body: { fileName, fileSize, mimeType, parentId, dataRoomId },
  });
}

export async function confirmUpload(id: NodeId): Promise<FileNode> {
  return mapNode(await apiFetch<RawNode>(`/nodes/${id}/confirm-upload`, { method: 'POST' })) as FileNode;
}

export async function getDownloadUrl(id: NodeId): Promise<string> {
  const { url } = await apiFetch<{ url: string }>(`/nodes/${id}/download-url`);
  return url;
}
