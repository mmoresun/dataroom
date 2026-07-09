import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DataRoomNode, NodeId } from './schema';

interface DataRoomDB extends DBSchema {
  nodes: {
    key: NodeId;
    value: DataRoomNode;
    indexes: { 'by-parent': NodeId };
  };
  blobs: {
    key: NodeId;
    value: Blob;
  };
}

const DB_NAME = 'dataroom';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<DataRoomDB>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<DataRoomDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const nodes = db.createObjectStore('nodes', { keyPath: 'id' });
        nodes.createIndex('by-parent', 'parentId');
        db.createObjectStore('blobs');
      },
    });
  }
  return dbPromise;
}
