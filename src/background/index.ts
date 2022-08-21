import MsgType from "../constants/msgType";

console.log("background");
chrome.tabs.onUpdated.addListener((tabId, tab) => {
  if (tab.url && tab.url.includes("youtube.com/watch")) {
    console.log("youtube", tabId);
    const query: string = tab.url.split("?")[1];
    const params: URLSearchParams = new URLSearchParams(query);
    console.log(params.get("v"));
    chrome.tabs.sendMessage(tabId, {
      type: MsgType.YoutubeVideo,
      url: tab.url.split("?")[0],
      videoId: params.get("v"),
    });
    //console.log(params.get("v"));
  }
});

chrome.runtime.onMessage.addListener(function (message) {
  switch (message.name) {
    case MsgType.PlayVideo:
      break;
    default:
  }
});
