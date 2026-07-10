import { ApiError } from '@/lib/api/client';
import * as api from '@/lib/api/nodes';
import type { DataRoom, DataRoomId, DataRoomNode, FileNode, FolderNode, NodeId } from '@/lib/db/schema';
import { isOpenElsewhere } from '@/lib/store/viewLock';
import { formatBytes } from '@/lib/format';

export class RepositoryError extends Error {}

/** Thrown by renameNode/renameDataRoom when the requested name collides with a sibling
 * — unlike create/upload, renaming to a taken name is rejected rather than auto-suffixed. */
export class DuplicateNameError extends RepositoryError {}

/** Maps the API layer's ApiError onto this module's own error hierarchy, so every
 * caller (dialogs, pages) keeps working against RepositoryError/DuplicateNameError
 * regardless of what's actually fetching the data underneath. */
function mapApiError(err: unknown, fallback: string): RepositoryError {
  if (err instanceof ApiError) {
    if (err.errors?.name === 'nameAlreadyExists') return new DuplicateNameError(err.message);
    return new RepositoryError(err.message);
  }
  return new RepositoryError(fallback);
}

export async function listChildren(dataRoomId: DataRoomId, parentId: NodeId): Promise<DataRoomNode[]> {
  try {
    return await api.listChildren(dataRoomId, parentId);
  } catch (err) {
    throw mapApiError(err, 'Failed to load folder.');
  }
}

export async function getNode(id: NodeId): Promise<DataRoomNode | undefined> {
  try {
    return await api.getNode(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw mapApiError(err, 'Failed to load item.');
  }
}

/** Direct child count (files + subfolders), not recursive. */
export async function countChildren(parentId: NodeId): Promise<number> {
  try {
    return await api.countChildren(parentId);
  } catch (err) {
    throw mapApiError(err, 'Failed to count items.');
  }
}

/** Path from the dataroom's root down to and including `id`. Empty array if id === rootId. */
export async function getBreadcrumb(id: NodeId, rootId: DataRoomId): Promise<DataRoomNode[]> {
  try {
    return await api.getBreadcrumb(id, rootId);
  } catch (err) {
    throw mapApiError(err, 'Failed to load breadcrumb.');
  }
}

export async function createFolder(name: string, parentId: NodeId, dataRoomId: DataRoomId): Promise<FolderNode> {
  const trimmed = name.trim();
  if (!trimmed) throw new RepositoryError('Folder name cannot be empty.');

  try {
    return await api.createFolder(trimmed, parentId, dataRoomId);
  } catch (err) {
    throw mapApiError(err, 'Failed to create folder.');
  }
}

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export async function uploadFile(file: File, parentId: NodeId, dataRoomId: DataRoomId): Promise<FileNode> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) throw new RepositoryError('Only PDF files are supported.');
  if (file.size === 0) throw new RepositoryError('The file is empty.');
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new RepositoryError(`File is too large. Maximum size is ${formatBytes(MAX_FILE_SIZE_BYTES)}.`);
  }

  let fileId: NodeId;
  let uploadUrl: string;
  try {
    ({ fileId, uploadUrl } = await api.requestUpload(
      file.name,
      file.size,
      file.type || 'application/pdf',
      parentId,
      dataRoomId,
    ));
  } catch (err) {
    throw mapApiError(err, 'Failed to upload file.');
  }

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Length': String(file.size) },
    body: file,
  });
  if (!putRes.ok) throw new RepositoryError('Failed to upload the file. Please try again.');

  try {
    return await api.confirmUpload(fileId);
  } catch (err) {
    throw mapApiError(err, 'Failed to finalize the upload.');
  }
}

export async function getDownloadUrl(id: NodeId): Promise<string> {
  try {
    return await api.getDownloadUrl(id);
  } catch (err) {
    throw mapApiError(err, 'Failed to load the file.');
  }
}

export async function renameNode(id: NodeId, newName: string): Promise<DataRoomNode> {
  const trimmed = newName.trim();
  if (!trimmed) throw new RepositoryError('Name cannot be empty.');

  if (await isOpenElsewhere(id)) {
    const node = await api.getNode(id).catch(() => undefined);
    const label = node ? `"${node.name}"` : 'This item';
    throw new RepositoryError(`${label} is open in another tab. Close it there before renaming.`);
  }

  try {
    return await api.renameNode(id, trimmed);
  } catch (err) {
    throw mapApiError(err, 'Failed to rename.');
  }
}

export async function deleteNode(id: NodeId): Promise<void> {
  if (await isOpenElsewhere(id)) {
    const node = await api.getNode(id).catch(() => undefined);
    const label = node ? `"${node.name}"` : 'This item';
    throw new RepositoryError(`${label} is open in another tab. Close it there before deleting.`);
  }

  try {
    await api.deleteNode(id);
  } catch (err) {
    throw mapApiError(err, 'Failed to delete.');
  }
}

export async function listDataRooms(): Promise<DataRoom[]> {
  try {
    return await api.listDataRooms();
  } catch (err) {
    throw mapApiError(err, 'Failed to load datarooms.');
  }
}

export async function getDataRoom(id: DataRoomId): Promise<DataRoom | undefined> {
  try {
    return await api.getDataRoom(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw mapApiError(err, 'Failed to load dataroom.');
  }
}

export async function countDataRoomChildren(id: DataRoomId): Promise<number> {
  try {
    return await api.countDataRoomChildren(id);
  } catch (err) {
    throw mapApiError(err, 'Failed to count items.');
  }
}

export async function createDataRoom(name: string): Promise<DataRoom> {
  const trimmed = name.trim();
  if (!trimmed) throw new RepositoryError('Dataroom name cannot be empty.');

  try {
    return await api.createDataRoom(trimmed);
  } catch (err) {
    throw mapApiError(err, 'Failed to create dataroom.');
  }
}

export async function renameDataRoom(id: DataRoomId, newName: string): Promise<DataRoom> {
  const trimmed = newName.trim();
  if (!trimmed) throw new RepositoryError('Name cannot be empty.');

  if (await isOpenElsewhere(id)) {
    const room = await api.getDataRoom(id).catch(() => undefined);
    const label = room ? `"${room.name}"` : 'This dataroom';
    throw new RepositoryError(`${label} is open in another tab. Close it there before renaming.`);
  }

  try {
    return await api.renameDataRoom(id, trimmed);
  } catch (err) {
    throw mapApiError(err, 'Failed to rename.');
  }
}

export async function deleteDataRoom(id: DataRoomId): Promise<void> {
  if (await isOpenElsewhere(id)) {
    const room = await api.getDataRoom(id).catch(() => undefined);
    const label = room ? `"${room.name}"` : 'This dataroom';
    throw new RepositoryError(`${label} is open in another tab. Close it there before deleting.`);
  }

  try {
    await api.deleteDataRoom(id);
  } catch (err) {
    throw mapApiError(err, 'Failed to delete.');
  }
}
