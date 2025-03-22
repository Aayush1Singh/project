import { analyzeContent } from "./analyzeContent";
import { analyzeRoute } from "./analyzeRoute";
const { observeDynamicContent } = require("./observeDynamicContent");
//will cause every webpage to get scanned if detection is enabled
window.addEventListener("load", async () => {
  chrome.storage.local.get("detectionEnabled", (result) => {
    if (result.detectionEnabled) {
      analyzeContent();
      analyzeRoute();
      observeDynamicContent();
    }
  });
});

// Detect harmful content only if detection is enabled
chrome.storage.local.get("detectionEnabled", (result) => {
  if (result.detectionEnabled) {
    analyzeContent();
  }
});

// Listen for toggle action from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "ENABLE_DETECTION") {
    analyzeContent();
  } else if (message.action === "DISABLE_DETECTION") {
    console.log("Detection disabled");
  }
});
