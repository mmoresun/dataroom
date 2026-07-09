import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DataRoom, DataRoomId, DataRoomNode, NodeId } from './schema';

interface DataRoomDB extends DBSchema {
  datarooms: {
    key: DataRoomId;
    value: DataRoom;
  };
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
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<DataRoomDB>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<DataRoomDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const nodes = db.createObjectStore('nodes', { keyPath: 'id' });
          nodes.createIndex('by-parent', 'parentId');
          db.createObjectStore('blobs');
        }
        if (oldVersion < 2) {
          db.createObjectStore('datarooms', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}
