import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface LanchesDB extends DBSchema {
  'offline-orders': {
    key: string;
    value: {
      uuid: string;
      payload: any;
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<LanchesDB>>;

if (typeof window !== 'undefined') {
  dbPromise = openDB<LanchesDB>('lanches-burger-db', 1, {
    upgrade(db) {
      db.createObjectStore('offline-orders', { keyPath: 'uuid' });
    },
  });
}

export async function saveOfflineOrder(uuid: string, payload: any) {
  const db = await dbPromise;
  await db.put('offline-orders', {
    uuid,
    payload,
    timestamp: Date.now(),
  });
}

export async function getPendingOrders() {
  const db = await dbPromise;
  return await db.getAll('offline-orders');
}

export async function deleteOfflineOrder(uuid: string) {
  const db = await dbPromise;
  await db.delete('offline-orders', uuid);
}
