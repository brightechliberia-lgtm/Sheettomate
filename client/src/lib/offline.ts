const DB = 'sheettomate-offline';
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates');
      if (!db.objectStoreNames.contains('lessons')) db.createObjectStore('lessons');
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheTemplate(id: string, payload: unknown) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    tx.objectStore('templates').put({ payload, savedAt: Date.now() }, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedTemplate<T>(id: string): Promise<T | undefined> {
  const row = await idbGet<{ payload: T }>( 'templates', id);
  return row?.payload;
}

export async function cacheLesson(id: string, payload: unknown) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('lessons', 'readwrite');
    tx.objectStore('lessons').put({ payload, savedAt: Date.now() }, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedLesson<T>(id: string): Promise<T | undefined> {
  const row = await idbGet<{ payload: T }>('lessons', id);
  return row?.payload;
}

export type QueueItem = {
  id: string;
  path: string;
  method: string;
  body?: string;
  createdAt: number;
};

export async function enqueue(item: Omit<QueueItem, 'id' | 'createdAt'>) {
  const record: QueueItem = {
    ...item,
    id: `${item.method}:${item.path}`,
    createdAt: Date.now(),
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await (reg as ServiceWorkerRegistration & { sync: { register: (t: string) => Promise<void> } }).sync
      .register('sheettomate-sync')
      .catch(() => undefined);
  }
}

export async function flushQueue(send: (item: QueueItem) => Promise<void>) {
  const db = await openDb();
  const items = await new Promise<QueueItem[]>((resolve, reject) => {
    const tx = db.transaction('queue', 'readonly');
    const req = tx.objectStore('queue').getAll();
    req.onsuccess = () => resolve((req.result as QueueItem[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  items.sort((a, b) => a.createdAt - b.createdAt);
  for (const item of items) {
    try {
      await send(item);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('queue', 'readwrite');
        tx.objectStore('queue').delete(item.id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      /* keep for retry; last-write-wins already used same id */
    }
  }
}
