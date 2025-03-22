async function updateStats(url, harmfulSections) {
  const stats = await chrome.storage.local.get("stats");
  const currentStats = stats["stats"] || {
    totalScanned: 0,
    harmfulDetected: 0,
    commonKeywords: {},
    recentHarmfulSites: [],
  };

  currentStats.totalScanned += 1;

  if (harmfulSections.length > 0) {
    currentStats.harmfulDetected += 1;
    currentStats.recentHarmfulSites.unshift(url); // Add site to top

    // Track common harmful keywords
    harmfulSections.forEach((section) => {
      const keyword = section.text.toLowerCase();
      currentStats.commonKeywords[keyword] =
        (currentStats.commonKeywords[keyword] || 0) + 1;
    });

    // Limit to recent 10 harmful sites
    if (currentStats.recentHarmfulSites.length > 10) {
      currentStats.recentHarmfulSites.pop();
    }
  }

  await chrome.storage.local.set({ stats: currentStats });
}
