const x = document.getElementById("toggleDetection");
console.log(x);
x.addEventListener("change", async (event) => {
  const isEnabled = event.target.checked;

  // Store the toggle state in chrome.storage
  await chrome.storage.local.set({ detectionEnabled: isEnabled });

  // Inform content.js to enable/disable detection
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: isEnabled ? "ENABLE_DETECTION" : "DISABLE_DETECTION",
    });
  });
});

// Clear cache button logic
document.getElementById("clearCache").addEventListener("click", async () => {
  await chrome.storage.local.clear();
  alert("Cache cleared successfully!");
});
document.addEventListener("DOMContentLoaded", async () => {
  const stats = await chrome.storage.local.get("stats");
  chrome.storage.local.get(["detectionEnabled"], (result) => {
    x.checked = result.detectionEnabled || false;
  });
  const {
    totalScanned = 0,
    harmfulDetected = 0,
    dangerousBlocked = 0, // Add this if you differentiate 'dangerous' items
    commonKeywords = {},
    recentHarmfulSites = [],
  } = stats["stats"] || {};
  x.addEventListener("change", () => {
    const isEnabled = toggleDetection.checked;
    chrome.storage.local.set({ detectionEnabled: isEnabled });

    if (isEnabled) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ["./content/content.js"], // Only inject content script when enabled
        });
      });
    }
  });

  // Display Stats
  document.getElementById("pages-scanned").textContent = totalScanned;
  document.getElementById("unsafe-blocked").textContent = harmfulDetected;
  document.getElementById("dangerous-blocked").textContent = dangerousBlocked;

  // Display Keywords
  const keywordList = document.getElementById("commonKeywords");
  keywordList.innerHTML = ""; // Clear previous content
  for (const [keyword, count] of Object.entries(commonKeywords)) {
    const li = document.createElement("li");
    li.textContent = `${keyword} (${count})`;
    keywordList.appendChild(li);
  }

  // Display Recent Harmful Sites
  const recentSitesList = document.getElementById("recentHarmfulSites");
  recentSitesList.innerHTML = ""; // Clear previous content
  recentHarmfulSites.forEach((site) => {
    const li = document.createElement("li");
    li.textContent = site;
    recentSitesList.appendChild(li);
  });
});
