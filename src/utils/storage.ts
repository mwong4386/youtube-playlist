export const getStorage = async (key: string) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get([key], (result) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        resolve(result[key]);
      });
    } catch (exception) {
      console.log("get storage exception");
      reject(exception);
    }
  });
};
