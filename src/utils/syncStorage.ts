declare const chrome: {
  runtime: {
    lastError?: unknown;
  };
  storage: {
    sync: {
      get: (
        keys: string[],
        callback: (result: Record<string, unknown>) => void
      ) => void;
    };
  };
};

export const getStorage = async (key: string) => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get([key], (result) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      resolve(result[key]);
    });
  });
};

export const getStorageMap = async (keys: string[]) => {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      resolve(result);
    });
  });
};
