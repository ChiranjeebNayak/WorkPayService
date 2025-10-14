import { AsyncLocalStorage } from "async_hooks";

const storage = new AsyncLocalStorage();

export const requestContext = {
  run: (initialData, callback) => {
    storage.run({ logs: [], ...initialData }, callback);
  },
  addLog: (logEntry) => {
    const store = storage.getStore();
    if (store) {
      store.logs.push({
        ...logEntry,
        timestamp: new Date().toISOString(),
      });
    }
  },
  getLogs: () => {
    const store = storage.getStore();
    return store ? store.logs : [];
  },
};
