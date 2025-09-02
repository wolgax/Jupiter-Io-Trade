chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "Jupiter Io Trade",
    title: "Enable/Disable Jupiter Widget",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "Jupiter Io Trade" && tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { cmd: "toggleWidget" });
  };
  
});