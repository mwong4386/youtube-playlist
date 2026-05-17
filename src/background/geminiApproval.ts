import MsgType from "../constants/msgType";

export async function requestGeminiActionApproval(
  actionName: string,
  params: any
): Promise<boolean> {
  return new Promise((resolve) => {
    // Attempt to send a message to the popup
    chrome.runtime.sendMessage(
      {
        type: MsgType.GeminiActionApprovalRequest,
        actionName,
        params,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          // This usually means the popup is closed.
          resolve(false);
          return;
        }
        resolve(!!response?.approved);
      }
    );
  });
}
