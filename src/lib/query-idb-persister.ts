import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";
import { STORAGE_KEYS } from "@/lib/brand";

const STORAGE_KEY = STORAGE_KEYS.reactQuery;
const STORAGE_KEY_LEGACY = STORAGE_KEYS.reactQueryLegacy;

export function createQueryIdbPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(STORAGE_KEY, client);
    },
    restoreClient: async () => {
      const next = await get<PersistedClient>(STORAGE_KEY);
      if (next) {
        return next;
      }
      const legacy = await get<PersistedClient>(STORAGE_KEY_LEGACY);
      if (legacy) {
        await set(STORAGE_KEY, legacy);
        await del(STORAGE_KEY_LEGACY);
      }
      return legacy;
    },
    removeClient: async () => {
      await del(STORAGE_KEY);
      await del(STORAGE_KEY_LEGACY);
    },
  };
}
