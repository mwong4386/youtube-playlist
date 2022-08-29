export const getStorage = async (key: string) => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get([key], (result) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      resolve(result[key]);
    });
  });
};
