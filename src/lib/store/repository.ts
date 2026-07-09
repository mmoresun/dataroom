import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db/db';
import { ROOT_ID, type DataRoomNode, type FileNode, type FolderNode, type NodeId } from '@/lib/db/schema';
import { isOpenElsewhere } from '@/lib/store/viewLock';
import { formatBytes } from '@/lib/format';

export { ROOT_ID };

export class RepositoryError extends Error {}

/** Thrown by renameNode when the requested name collides with a sibling — unlike
 * create/upload, renaming to a taken name is rejected rather than auto-suffixed. */
export class DuplicateNameError extends RepositoryError {}

/** Splits "Report.pdf" into ["Report", ".pdf"]; folders have no extension. */
function splitName(name: string): [base: string, ext: string] {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return [name, ''];
  return [name.slice(0, dot), name.slice(dot)];
}

const DUPLICATE_SUFFIX = / \(\d+\)$/;

/** Strips a trailing " (N)" so we bump the number instead of stacking another suffix onto it. */
function stripDuplicateSuffix(base: string): string {
  return base.replace(DUPLICATE_SUFFIX, '');
}

/**
 * Appends " (1)", " (2)", ... before the extension until the name is unique among siblings.
 * If `name` already ends in " (N)" (e.g. renaming to a name that collides with "folder (1)"),
 * that suffix is stripped first so the result is "folder (2)", not "folder (1) (1)".
 */
function resolveUniqueName(siblingNames: Set<string>, name: string): string {
  if (!siblingNames.has(name)) return name;
  const [base, ext] = splitName(name);
  const coreBase = stripDuplicateSuffix(base);
  let i = 1;
  let candidate = `${coreBase} (${i})${ext}`;
  while (siblingNames.has(candidate)) {
    i += 1;
    candidate = `${coreBase} (${i})${ext}`;
  }
  return candidate;
}

async function siblingNames(parentId: NodeId, excludeId?: NodeId): Promise<Set<string>> {
  const db = await getDb();
  const siblings = await db.getAllFromIndex('nodes', 'by-parent', parentId);
  return new Set(siblings.filter((n) => n.id !== excludeId).map((n) => n.name));
}

export async function listChildren(parentId: NodeId = ROOT_ID): Promise<DataRoomNode[]> {
  const db = await getDb();
  const children = await db.getAllFromIndex('nodes', 'by-parent', parentId);
  return children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export async function getNode(id: NodeId): Promise<DataRoomNode | undefined> {
  const db = await getDb();
  return db.get('nodes', id);
}

/** Direct child count (files + subfolders), not recursive. */
export async function countChildren(parentId: NodeId): Promise<number> {
  const db = await getDb();
  return db.countFromIndex('nodes', 'by-parent', parentId);
}

/** Path from the (virtual) root down to and including `id`. Empty array if id is ROOT_ID. */
export async function getBreadcrumb(id: NodeId): Promise<DataRoomNode[]> {
  const path: DataRoomNode[] = [];
  let current = id;
  while (current !== ROOT_ID) {
    const node = await getNode(current);
    if (!node) break;
    path.unshift(node);
    current = node.parentId;
  }
  return path;
}

export async function createFolder(name: string, parentId: NodeId = ROOT_ID): Promise<FolderNode> {
  const trimmed = name.trim();
  if (!trimmed) throw new RepositoryError('Folder name cannot be empty.');

  const db = await getDb();
  const finalName = resolveUniqueName(await siblingNames(parentId), trimmed);
  const now = Date.now();
  const folder: FolderNode = {
    id: uuidv4(),
    type: 'folder',
    name: finalName,
    parentId,
    createdAt: now,
    updatedAt: now,
  };
  await db.put('nodes', folder);
  return folder;
}

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export async function uploadFile(file: File, parentId: NodeId = ROOT_ID): Promise<FileNode> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) throw new RepositoryError('Only PDF files are supported.');
  if (file.size === 0) throw new RepositoryError('The file is empty.');
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new RepositoryError(`File is too large. Maximum size is ${formatBytes(MAX_FILE_SIZE_BYTES)}.`);
  }

  const db = await getDb();
  const finalName = resolveUniqueName(await siblingNames(parentId), file.name);
  const now = Date.now();
  const node: FileNode = {
    id: uuidv4(),
    type: 'file',
    name: finalName,
    parentId,
    createdAt: now,
    updatedAt: now,
    size: file.size,
    mimeType: file.type || 'application/pdf',
  };

  try {
    const tx = db.transaction(['nodes', 'blobs'], 'readwrite');
    await Promise.all([
      tx.objectStore('nodes').put(node),
      tx.objectStore('blobs').put(file, node.id),
      tx.done,
    ]);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new RepositoryError('Not enough storage space to save this file. Free up space and try again.');
    }
    throw err;
  }
  return node;
}

export async function getFileBlob(id: NodeId): Promise<Blob | undefined> {
  const db = await getDb();
  return db.get('blobs', id);
}

export async function renameNode(id: NodeId, newName: string): Promise<DataRoomNode> {
  const trimmed = newName.trim();
  if (!trimmed) throw new RepositoryError('Name cannot be empty.');

  const db = await getDb();
  const node = await db.get('nodes', id);
  if (!node) throw new RepositoryError('Item no longer exists.');

  if (await isOpenElsewhere(id)) {
    throw new RepositoryError(`"${node.name}" is open in another tab. Close it there before renaming.`);
  }

  if ((await siblingNames(node.parentId, id)).has(trimmed)) {
    throw new DuplicateNameError(`A ${node.type} named "${trimmed}" already exists here.`);
  }

  const updated: DataRoomNode = { ...node, name: trimmed, updatedAt: Date.now() };
  await db.put('nodes', updated);
  return updated;
}

/** Recursively collects a node and every descendant (files and folders), itself included. */
async function collectSubtree(node: DataRoomNode): Promise<DataRoomNode[]> {
  if (node.type !== 'folder') return [node];

  const db = await getDb();
  const nodes: DataRoomNode[] = [node];
  const children = await db.getAllFromIndex('nodes', 'by-parent', node.id);
  for (const child of children) {
    nodes.push(...(await collectSubtree(child)));
  }
  return nodes;
}

/** First node in the list still held open (view lock) by another tab, if any. */
async function findOpenNode(nodes: DataRoomNode[]): Promise<DataRoomNode | undefined> {
  for (const n of nodes) {
    if (await isOpenElsewhere(n.id)) return n;
  }
  return undefined;
}

export async function deleteNode(id: NodeId): Promise<void> {
  const db = await getDb();
  const node = await db.get('nodes', id);
  if (!node) return;

  const subtree = await collectSubtree(node);

  const openNode = await findOpenNode(subtree);
  if (openNode) {
    throw new RepositoryError(
      `"${openNode.name}" is open in another tab. Close it there before deleting.`,
    );
  }

  const tx = db.transaction(['nodes', 'blobs'], 'readwrite');
  await Promise.all([
    ...subtree.map((n) => tx.objectStore('nodes').delete(n.id)),
    ...subtree.map((n) => tx.objectStore('blobs').delete(n.id)),
    tx.done,
  ]);
}
