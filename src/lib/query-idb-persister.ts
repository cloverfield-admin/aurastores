import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";

const STORAGE_KEY = "aurapharma-react-query";

export function createQueryIdbPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(STORAGE_KEY, client);
    },
    restoreClient: async () => {
      return get<PersistedClient>(STORAGE_KEY);
    },
    removeClient: async () => {
      await del(STORAGE_KEY);
    },
  };
}
