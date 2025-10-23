import { AsyncLocalStorage } from "async_hooks";

const storage = new AsyncLocalStorage();

export const requestContext = {
  run: (data, callback) => {
    storage.run({ logs: [], messageCounter: 0, ...data }, callback);
  },
  get: () => storage.getStore() || {},
  getTxnId: () => storage.getStore()?.txnId || "-",
  getApiName: () => storage.getStore()?.apiName || "-",
  nextMessageNumber: () => {
    const store = storage.getStore();
    if (!store) return "-";
    store.messageCounter++;
    return store.messageCounter;
  },
  addLog: (entry) => {
    const store = storage.getStore();
    if (store) store.logs.push(entry);
  },
  getLogs: () => storage.getStore()?.logs || [],
};
