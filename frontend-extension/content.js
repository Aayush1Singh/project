// Run content analysis automatically when the page loads
window.addEventListener("load", async () => {
  console.log("gayononoonon");
  // var documentClone = document.cloneNode(true);
  // var article = new Readability(documentClone).parse();
  // console.log(article.content);

  chrome.storage.local.get("detectionEnabled", (result) => {
    // console.log("sjdljfljalfjaslfjajfja;ljajlds;lk", result);
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
  const { pageContent, text } = extractPageContent();
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
      text,
    }),
  });
  const { output } = await response.json();
  console.log(await response.json());
  const { harmfulSections } = await response.json();
  await chrome.storage.local.set({ [storageKey]: harmfulSections });
  highlightHarmfulContent(output.split("\n"));
}

function extractPageContent() {
  const contentSelectors = [
    "p",
    "h1",
    "h2",
    "h3",
    "li",
    "blockquote",
    "article",
    "section",
    "div:not(:has(> *))",
    "a",
  ];
  //selecting all elements
  const elements = document.querySelectorAll(contentSelectors.join(", "));
  // assigning a uniwue id to each tag
  elements.forEach((el, index) => {
    el.setAttribute("data-original-id", `${index}`);
  });
  const documentClone = document.cloneNode(true);
  documentClone
    .querySelectorAll(contentSelectors.join(", "))
    .forEach((el, index) => {
      const originalId = el.getAttribute("data-original-id");
      el.innerText = el.innerText.trim();
      el.innerText += `\u2063#FP~${originalId}\u2063 `;
    });
  const article = new Readability(documentClone).parse();
  console.log("after refining", article.content);
  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(article.content, "text/html");
  // Extract all text content
  const allTextContent = parsedDocument.body.innerText.trim();
  console.log(allTextContent);

  return {
    pageContent: Array.from(document.querySelectorAll("p, div, h1, h2, h3"))
      .map((el, index) => {
        if (el.innerText.length < 3) return;
        el.setAttribute("data-content-id", `content-${index}`);
        return {
          id: `content-${index}`,
          text: el.innerText,
          tag: el.tagName.toLowerCase(),
        };
      })
      .filter((e) => {
        if (e) return true;
        else return false;
      }),
    text: allTextContent,
  };
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
