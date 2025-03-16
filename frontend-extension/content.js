// Run content analysis automatically when the page loads
window.addEventListener("load", async () => {
  console.log("gayononoonon");
  var documentClone = document.cloneNode(true);
  var article = new Readability(documentClone).parse();
  console.log(article.content);

  chrome.storage.local.get("detectionEnabled", (result) => {
    console.log("sjdljfljalfjaslfjajfja;ljajlds;lk", result);
    if (result.detectionEnabled) {
      analyzeContent();
    }
  });
});
// Detect harmful content only if detection is enabled
chrome.storage.local.get("detectionEnabled", (result) => {
  console.log("sjdljfljalfjaslfjajfja;ljajlds;lk", result);
  if (result.detectionEnabled) {
    analyzeContent();
  }
});
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

// Listen for toggle action from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "ENABLE_DETECTION") {
    analyzeContent();
  } else if (message.action === "DISABLE_DETECTION") {
    console.log("Detection disabled");
  }
});
async function analyzeContent() {
  const pageContent = extractPageContent();
  console.log(pageContent);
  const url = window.location.href;

  // Check if cached data exists
  const storageKey = `harmfulContent-${url}`;
  const cachedData = await chrome.storage.local.get(storageKey);

  if (cachedData[storageKey]) {
    console.log("Using cached data...");
    highlightHarmfulContent(cachedData[storageKey]);
    return;
  }
  console.log("hello");
  console.log(pageContent);
  // If no cache, send to backend
  const response = await fetch("http://127.0.0.1:5000/analyze-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "text", // Change this based on the data type: "url", "image", or "text"
      content: pageContent,
    }),
  });

  const { harmfulSections } = await response.json();
  await chrome.storage.local.set({ [storageKey]: harmfulSections });
  highlightHarmfulContent(harmfulSections);
}

function extractPageContent() {
  return Array.from(document.querySelectorAll("p, div, h1, h2, h3")).map(
    (el, index) => {
      if (el.innerText.length < 3) return;
      el.setAttribute("data-content-id", `content-${index}`);
      return {
        id: `content-${index}`,
        text: el.innerText,
        tag: el.tagName.toLowerCase(),
      };
    }
  );
}

function highlightHarmfulContent(harmfulSections) {
  harmfulSections.forEach(({ id, text }) => {
    const element = document.querySelector(`[data-content-id="${id}"]`);
    if (element) {
      const highlightedHTML = element.innerHTML.replace(
        new RegExp(`(${text})`, "gi"),
        `<mark style="background-color: red; color: white;">$1</mark>`
      );
      element.innerHTML = highlightedHTML;
    }
  });
}

// async function extractPageContent() {
//   const textContent = document.body.innerText; // Fetches full text from webpage

//   console.log(textContent);
//   Array.from(document.querySelectorAll("p, span, div, h1, h2, h3")).map(
//     (el) => ({
//       text: el.innerText,
//       element: el,
//     })
//   );

//   // const response = await fetch("https://your-backend.com/analyze", {
//   //   method: "POST",
//   //   headers: { "Content-Type": "application/json" },
//   //   body: JSON.stringify({ content: textContent }),
//   // });
//   // const data = await response.json();
//   // Highlight harmful content
//   // highlightHarmfulContent(data.harmfulSections);
// }

// function highlightHarmfulContent(sections) {
//   const bodyHTML = document.body.innerHTML;

//   sections.forEach((section) => {
//     const highlightedText = `<span style="background-color: red; color: white;">${section}</span>`;
//     document.body.innerHTML = bodyHTML.replace(section, highlightedText);
//   });
// }

// // Trigger content extraction
// extractPageContent();
