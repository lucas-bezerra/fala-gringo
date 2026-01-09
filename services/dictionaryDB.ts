import { openDB } from 'idb';

const DB_NAME = 'falagringo-dictionaries';
const STORE = 'dicts';

export const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE);
    }
  }
});

export async function getDictionaryFromDB(key: string): Promise<string | null> {
  const db = await dbPromise;
  return (await db.get(STORE, key)) ?? null;
}

export async function saveDictionaryToDB(key: string, text: string) {
  const db = await dbPromise;
  await db.put(STORE, text, key);
}
