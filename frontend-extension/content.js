window.addEventListener("load", async () => {
  chrome.storage.local.get("detectionEnabled", (result) => {
    if (result.detectionEnabled) {
      // console.log("hello");
      analyzeContent();
      analyzeRoute();
      observeDynamicContent();
    }
  });
});
function extractPageContentMutation() {
  // console.log("hi");
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
    el.classList.add(`data-original-id${index}`);
  });
  const documentClone = document.cloneNode(true);
  documentClone
    .querySelectorAll(contentSelectors.join(", "))
    .forEach((el, index) => {
      const originalId = el.getAttribute("data-original-id");
      el.innerText = el.innerText.replace(/\s+/g, " ");
      if (el.innerText == " " || el.innerText == "") return;
      el.innerText += ` \u2063#FP~${originalId}\u2063 `;
      // console.log(el.innerText);
    });
  const flattenedDOM = flattenContent(documentClone.body);
  const newDoc =
    document.implementation.createHTMLDocument("Flattened Content");
  newDoc.body.innerHTML = flattenedDOM.innerHTML; // flattenedDOM from your flattenContent function

  const article = new Readability(newDoc).parse();
  // console.log("after refining", article.content);
  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(article.content, "text/html");
  // Extract all text content
  var allTextContent = parsedDocument.body.innerText.trim();
  allTextContent = allTextContent.replace(/\s+/g, " ");
  // console.log(allTextContent);
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

async function observeDynamicContent() {
  var { lastIndex: index } = (await chrome.storage.local.get("lastIndex")) || 0;
  // console.log(index);
  const observer = new MutationObserver(async (mutations) => {
    const newElements = [];
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
    const newDoc =
      document.implementation.createHTMLDocument("Extracted Content");

    setTimeout(() => {
      mutations.forEach(async (mutation) => {
        mutation.addedNodes.forEach((node) => {
          // console.log(node);
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          // setTimeout()

          //selecting all elements
          const elements = Array.from(
            node.querySelectorAll(contentSelectors.join(", "))
          );
          // console.log(elements);
          // assigning a uniwue id to each tag
          //get index;

          elements.forEach((el) => {
            el.setAttribute("data-original-id", `${index}`);
            el.classList.add(`data-original-id${index}`);
            index++;
          });
          const container = document.createElement("div");
          elements.forEach((el) => {
            console.log(el);
            // Optionally, modify el.innerText here if needed (e.g., replace extra spaces, add markers, etc.)
            container.appendChild(el.cloneNode(true));
          });

          newDoc.body.innerHTML += container.innerHTML;
          // console.log(container);
          // const documentClone = document.cloneNode(true);
        });
      });

      newDoc
        .querySelectorAll(contentSelectors.join(", "))
        .forEach((el, index) => {
          const originalId = el.getAttribute("data-original-id");
          el.innerText = el.innerText.replace(/\s+/g, " ");
          if (el.innerText == " " || el.innerText == "") return;
          el.innerText += ` \u2063#FP~${originalId}\u2063 `;
        });
      // console.log(newDoc);
      const article = new Readability(newDoc).parse();
      const parser = new DOMParser();
      if (!article) return;
      const parsedDocument = parser.parseFromString(
        article.content,
        "text/html"
      );
      var allTextContent = parsedDocument.body.innerText.trim();
      allTextContent = allTextContent.replace(/\s+/g, " ");
      // console.log(allTextContent);
      chrome.storage.local.set({ lastIndex: index });
      analyzeContentMutation(allTextContent);
      return { allTextContent };
    }, 1000);

    // if (newElements.length > 0) {
    //   const results = await analyzeContent(newElements);
    //   maskHarmfulContent(newElements, results);
    // }
  });

  observer.observe(document.body, {
    childList: true, // Detect new elements added
    subtree: true, // Observe nested elements (important for dynamic content)
  });
}

async function analyzeRoute() {
  // console.log("hello");
  const currentHost = window.location.hostname;

  // Get all anchor (`a`) tags
  const links = document.querySelectorAll("a");

  // Extract only external links
  const externalLinks = [...links]
    .map((link, index) => {
      link.classList.add(`cotent-${index}`);
      return { url: link.href, index };
    }) // Get href attribute
    .filter((href) => {
      try {
        const linkHost = new URL(href.url).hostname; // Extract hostname
        return linkHost !== currentHost; // Keep only external links
      } catch (error) {
        return false; // Ignore invalid URLs
      }
    });
  // console.log(externalLinks);

  const response = await fetch("http://127.0.0.1:5000/scamphishing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      urls: externalLinks,
    }),
  });
  const x = await response.json();
  // console.log(x);
  const style = document.createElement("style");
  style.textContent = `
  .malicious-link::after {
    content: " ";
    display: inline-block;
    width: 8px;
    height: 8px;
    background-color: red;
    border-radius: 50%;
    margin-left: 6px;
    vertical-align: middle;
    box-shadow: 0 0 5px rgba(255, 0, 0, 0.8);
  }
`;
  document.head.appendChild(style);
  x.ids.forEach((e) => {
    // console.log(x);
    const element = document.querySelector(`.cotent-${e}`);
    element.classList.add("malicious-link");
    element.classList.add("malicious-link");
  });
}
// Detect harmful content only if detection is enabled
chrome.storage.local.get("detectionEnabled", (result) => {
  // console.log("sjdljfljalfjaslfjajfja;ljajlds;lk", result);
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
  const { text } = await extractPageContent();
  // console.log("hello", text);

  // console.log(pageContent);
  const url = window.location.href;

  // Check if cached data exists
  const storageKey = `harmfulContent-${url}`;
  const cachedData = await chrome.storage.local.get(storageKey);

  if (cachedData[storageKey]) {
    console.log("Using cached data...");
    highlightHarmfulContent(cachedData[storageKey]);
    console.log("exiting from it due to storage");
    return;
  }
  // console.log("hello");
  // console.log(pageContent);
  // console.log(text);
  // If no cache, send to backend
  // return;
  const response = await fetch("http://127.0.0.1:5000/analyze-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "text", // Change this based on the data type: "url", "image", or "text"
      // content: pageContent,
      text,
    }),
  });
  const { output } = await response.json();
  // console.log(output);
  // console.log(await response.json());
  // const { harmfulSections } = await response.json();
  // await chrome.storage.local.set({ [storageKey]: harmfulSections });
  highlightHarmfulContent(output.split("\n"));
}
async function analyzeContentMutation(text) {
  // const { text } = extractPageContent();
  // console.log("hello");
  // console.log(pageContent);
  const url = window.location.href;

  // Check if cached data exists
  // const storageKey = `harmfulContent-${url}`;
  // const cachedData = await chrome.storage.local.get(storageKey);

  // if (cachedData[storageKey]) {
  //   console.log("Using cached data...");
  //   highlightHarmfulContent(cachedData[storageKey]);
  //   console.log("exiting from it due to storage");
  //   return;
  // }
  // console.log("hello");
  // console.log(pageContent);
  // console.log(text);
  // If no cache, send to backend
  // return;
  const response = await fetch("http://127.0.0.1:5000/analyze-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "text", // Change this based on the data type: "url", "image", or "text"
      // content: pageContent,
      text,
    }),
  });
  const { output } = await response.json();

  // console.log(await response.json());
  // const { harmfulSections } = await response.json();
  // await chrome.storage.local.set({ [storageKey]: harmfulSections });
  highlightHarmfulContent(output.split("\n"));
}

function flattenContent(
  root,
  selectors = ["P", "H1", "H2", "H3", "H4", "H5", "H6", "ARTICLE"]
) {
  // Create a new container for the flattened content
  const newContainer = document.createElement("div");

  // Create a TreeWalker to traverse the DOM from the given root
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function (node) {
        // Accept the node if its tagName is one of the selectors
        if (selectors.includes(node.tagName)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    },
    false
  );

  // Traverse the tree and append clones of the relevant nodes to the new container
  while (walker.nextNode()) {
    const node = walker.currentNode;
    // Clone the node to avoid altering the original DOM
    newContainer.appendChild(node.cloneNode(true));
  }

  return newContainer;
}

async function extractPageContent() {
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
  var y = 0;
  elements.forEach((el, index) => {
    el.setAttribute("data-original-id", `${index}`);
    el.classList.add(`data-original-id${index}`);
    y++;
  });
  await chrome.storage.local.set({ lastIndex: y });
  const documentClone = document.cloneNode(true);
  documentClone
    .querySelectorAll(contentSelectors.join(", "))
    .forEach((el, index) => {
      const originalId = el.getAttribute("data-original-id");
      el.innerText = el.innerText.replace(/\s+/g, " ");
      if (el.innerText == " " || el.innerText == "") return;
      el.innerText += ` \u2063#FP~${originalId}\u2063 `;
      // console.log(el.innerText);
    });
  const flattenedDOM = flattenContent(documentClone.body);
  const newDoc =
    document.implementation.createHTMLDocument("Flattened Content");
  newDoc.body.innerHTML = flattenedDOM.innerHTML; // flattenedDOM from your flattenContent function

  const article = new Readability(newDoc).parse();
  // console.log("after refining", article.content);
  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(article.content, "text/html");
  // Extract all text content
  var allTextContent = parsedDocument.body.innerText.trim();
  allTextContent = allTextContent.replace(/\s+/g, " ");
  // console.log(allTextContent);
  return {
    text: allTextContent,
  };
}

function highlightHarmfulContent(harmfulSections) {
  harmfulSections.forEach((id) => {
    // console.log(`data-original-id${id.slice(3)}`);
    const element = document.querySelector(`.data-original-id${id.slice(3)}`);
    // console.log(element);
    if (element) {
      element.style.position = "relative";
      element.style.color = "transparent"; // Hide text
      element.style.backgroundColor = "rgba(255, 0, 0, 0.8)"; // Red overlay
      element.style.backdropFilter = "blur(8px)"; // Modern blur effect
      element.style.borderRadius = "8px"; // Soft rounded corners
      element.style.padding = "2px 5px"; // Clean spacing
      element.style.cursor = "not-allowed"; // Indicate restricted content

      // Optional: Show text on hover for moderation purposes
      element.addEventListener("mouseover", () => {
        element.style.color = "white"; // Text appears
        element.style.backgroundColor = "rgba(255, 0, 0, 0.9)";
      });

      element.addEventListener("mouseout", () => {
        element.style.color = "transparent"; // Text re-hidden
        element.style.backgroundColor = "rgba(255, 0, 0, 0.8)";
      });
      // const text = element.innerText;
      // const highlightedHTML = element.innerHTML.replace(
      //   new RegExp(`(${text})`, "gi"),
      //   `<mark style="background-color: red; color: white;">$1</mark>`
      // );
      // element.innerHTML = highlightedHTML;
    }
  });
}
