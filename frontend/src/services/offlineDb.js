const DB_NAME = 'bibliofinder_offline';
const DB_VERSION = 1;
const STORE_DRAFTS = 'drafts';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE_DRAFTS, mode);
        const store = t.objectStore(STORE_DRAFTS);
        const result = fn(store);
        t.oncomplete = () => resolve(result._result ?? result);
        t.onerror = () => reject(t.error);
      })
  );
}

export function saveDraft(data) {
  return tx('readwrite', (store) => {
    const record = { ...data, savedAt: new Date().toISOString(), synced: false };
    const req = store.put(record);
    const wrapper = {};
    req.onsuccess = () => { wrapper._result = req.result; };
    return wrapper;
  });
}

export function getAllDrafts() {
  return tx('readonly', (store) => {
    const req = store.getAll();
    const wrapper = {};
    req.onsuccess = () => { wrapper._result = req.result; };
    return wrapper;
  });
}

export function getDraft(id) {
  return tx('readonly', (store) => {
    const req = store.get(id);
    const wrapper = {};
    req.onsuccess = () => { wrapper._result = req.result; };
    return wrapper;
  });
}

export function deleteDraft(id) {
  return tx('readwrite', (store) => {
    store.delete(id);
  });
}

export function markSynced(id) {
  return tx('readwrite', (store) => {
    const req = store.get(id);
    req.onsuccess = () => {
      if (req.result) {
        store.put({ ...req.result, synced: true, syncedAt: new Date().toISOString() });
      }
    };
  });
}
