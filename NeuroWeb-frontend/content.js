const API_URL = "https://random-server-b310.onrender.com";
window.addEventListener("load", async () => {
  try {
    chrome.storage.local.get("detectionEnabled", async (result) => {
      if (result.detectionEnabled) {
        analyzeContent();
        analyzeRoute();
        analyzeImages();
        observeDynamicContent();
      }
    });
  } catch (err) {}
});
/**
 * LOCALHOST SERVER
 *http://127.0.0.1:500
 *
 *HOSTED SERVER
 *https://random-server-b310.onrender.com
 */

// Listen for toggle action from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "ENABLE_DETECTION") {
    analyzeContent();
    analyzeRoute();
    analyzeImages();
    observeDynamicContent();
  } else if (message.action === "DISABLE_DETECTION") {
    console.log("Detection disabled");
  }
});

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

//extracting all paragraph of interest on first webapge load
async function extractPageContent() {
  const contentSelectors = [
    "p",
    "h1",
    "h2",
    "h3",
    "li",
    "blockquote",
    "article:not(:has(> *))",
    "section:not(:has(> *))",
    "div:not(:has(> *))",
  ];
  // var documentClone =
  //   document.implementation.createHTMLDocument("Flattened Content");
  // const articleWrapper = documentClone.createElement("article");
  // documentClone.body.appendChild(articleWrapper); //selecting all elements
  const elements = document.querySelectorAll(contentSelectors.join(", "));
  // assigning a unique id to each tag
  var y = 0;
  elements.forEach((el, index) => {
    el.setAttribute("data-original-id", `${index}`);
    el.classList.add(`data-original-id${index}`);
    y++;
  });

  await chrome.storage.local.set({ lastIndex: y });
  const htmlString = document.documentElement.outerHTML;

  // Use DOMParser to convert the HTML string back into a Document
  const parser = new DOMParser();
  const documentClone = parser.parseFromString(htmlString, "text/html"); // const parser2 = new DOMParser();

  // //attaching a finger print to each paragraph.
  documentClone
    .querySelectorAll(contentSelectors.join(", "))
    .forEach((el, index) => {
      const originalId = el.getAttribute("data-original-id");
      el.innerText = el.innerText.replace(/\s+/g, " ");
      if (el.innerText == " " || el.innerText == "") return;
      el.innerText += ` \u2063#FP~${originalId}\u2063 `;
    });
  //flattening the website
  const flattenedDOM = flattenContent(documentClone.body);
  const newDoc =
    document.implementation.createHTMLDocument("Flattened Content");
  newDoc.body.innerHTML = flattenedDOM.innerHTML;
  //parsing the document
  const article = new Readability(documentClone).parse();
  // const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(article.content, "text/html");
  // Extract all text content
  var allTextContent = parsedDocument.body.innerText.trim();
  //trimming down if any unwanted spaces.
  allTextContent = allTextContent.replace(/\s+/g, " ");
  return {
    text: allTextContent,
  };
}

async function analyzeContent() {
  const { text } = await extractPageContent();
  const url = window.location.href;

  // Check if cached data exists
  const storageKey = `harmfulContent-${url}`;
  const cachedData = await chrome.storage.local.get(storageKey);

  if (cachedData[storageKey]) {
    highlightHarmfulContent(cachedData[storageKey]);
    return;
  }
  const response = await fetch(`${API_URL}/analyze-content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "text", // Change this based on the data type: "url", "image", or "text"
      text,
    }),
  });
  const { output } = await response.json();
  const stats = await chrome.storage.local.get("stats");
  const currentStats = stats["stats"] || {
    totalScanned: 0,
    harmfulDetected: 0,
  };
  currentStats.totalScanned = currentStats.totalScanned + 1;
  await chrome.storage.local.set({ stats: currentStats });

  highlightHarmfulContent(output.split(","));
}

async function analyzeRoute() {
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
  const response = await fetch(`${API_URL}/scamphishing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      urls: externalLinks,
    }),
  });
  const x = await response.json();
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
    const element = document.querySelector(`.cotent-${e}`);
    element.classList.add("malicious-link");
    element.classList.add("malicious-link");
  });
}
async function analyzeLinksMutation(links) {
  const response = await fetch(`${API_URL}/scamphishing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      urls: links,
    }),
  });
  const x = await response.json();
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
    const element = document.querySelector(`.cotent-${e}`);
    element.classList.add("malicious-link");
    element.classList.add("malicious-link");
  });
}
async function highlightHarmfulContent(harmfulSections) {
  const stats = await chrome.storage.local.get("stats");
  const currentStats = stats["stats"] || {
    totalScanned: 0,
    harmfulDetected: 0,
  };
  currentStats.harmfulDetected += harmfulSections.length;
  await chrome.storage.local.set({ stats: currentStats });
  harmfulSections.forEach((id) => {
    const element = document.querySelector(`.data-original-id${id.slice(3)}`);
    if (element) {
      element.style.position = "relative";
      // element.style.color = "rgba(255, 0, 0, 0.8)"; // Hide text
      element.style.setProperty("color", "transparent", "important");
      element.style.backgroundColor = "rgba(255, 0, 0, 0.8)"; // Red overlay
      element.style.backdropFilter = "blur(8px)"; // Modern blur effect
      element.style.borderRadius = "8px"; // Soft rounded corners
      element.style.padding = "2px 5px"; // Clean spacing
      element.style.cursor = "not-allowed"; // Indicate restricted content
      // element.addEventListener("mouseover", () => {
      //   element.style.color = "white"; // Text appears
      //   element.style.backgroundColor = "rgba(255, 0, 0, 0.9)";
      // });

      // element.addEventListener("mouseout", () => {
      //   element.style.color = "transparent"; // Text re-hidden
      //   element.style.backgroundColor = "rgba(255, 0, 0, 0.8)";
      // });
    }
  });
}

async function analyzeContentMutation(text) {
  const url = window.location.href;
  const response = await fetch(`${API_URL}/analyze-content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "text",
      text,
    }),
  });
  const { output } = await response.json();
  highlightHarmfulContent(output.split(","));
}

//for observing changes in webpage and
async function observeDynamicContent() {
  var { lastIndex: index } = (await chrome.storage.local.get("lastIndex")) || 0;
  const observer = new MutationObserver(async (mutations) => {
    const newElements = [];
    var externalLinks = [];
    var imageData = [];
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
    ];
    const newDoc =
      document.implementation.createHTMLDocument("Extracted Content");

    setTimeout(() => {
      mutations.forEach(async (mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const elements = Array.from(
            node.querySelectorAll(contentSelectors.join(", "))
          );
          elements.forEach((el) => {
            el.setAttribute("data-original-id", `${index}`);
            el.classList.add(`data-original-id${index}`);
            index++;
          });
          const container = document.createElement("div");
          elements.forEach((el) => {
            container.appendChild(el.cloneNode(true));
          });

          newDoc.body.innerHTML += container.innerHTML;

          const currentHost = window.location.hostname;
          // Get all anchor (`a`) tags
          const links = node.querySelectorAll("a");
          // Extract only external links
          externalLinks = [...links]
            .map((link) => {
              index++;
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
          const images = node.querySelectorAll("img");
          imageData = [
            ...imageData,
            ...[...images].map((img) => {
              index++;
              img.classList.add(`image-${index}`);
              // Unique class for reference
              return { url: img.src, index };
            }),
          ];
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
      const article = new Readability(newDoc).parse();
      const parser = new DOMParser();
      if (!article) return;
      const parsedDocument = parser.parseFromString(
        article.content,
        "text/html"
      );
      var allTextContent = parsedDocument.body.innerText.trim();
      allTextContent = allTextContent.replace(/\s+/g, " ");

      analyzeContentMutation(allTextContent);

      analyzeLinksMutation(externalLinks);

      // Extract image URLs and assign unique class names
      analyzeImagesMutation(imageData);
      chrome.storage.local.set({ lastIndex: index });
      // await chrome.storage.local.set({ lastIndex: index });
      // return { allTextContent };
    }, 1000);
  });

  observer.observe(document.body, {
    childList: true, // Detect new elements added
    subtree: true, // Observe nested elements (important for dynamic content)
  });
}

async function analyzeImages() {
  var { lastIndex: index } = (await chrome.storage.local.get("lastIndex")) || 0;
  const images = document.querySelectorAll("img");

  // Extract image URLs and assign unique class names
  const imageData = [...images].map((img) => {
    index++;
    img.classList.add(`image-${index}`);
    // Unique class for reference
    return { url: img.src, index };
  });

  await chrome.storage.local.set({ lastIndex: index });
  // Send image URLs to backend
  try {
    const response = await fetch(`${API_URL}/analyze-images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: imageData }),
    });

    const flaggedImages = await response.json(); // Backend returns flagged indices

    // Inject styles for explicit images
    const style = document.createElement("style");
    style.textContent = `
      .explicit-image {
        filter: blur(10px); /* Blur effect */
        transition: filter 0.3s ease-in-out;
      }
      // .explicit-image:hover {
      //   filter: none; /* Allow users to view on hover if needed */
      // }
    `;
    document.head.appendChild(style);
    // Apply blur to flagged images
    flaggedImages["nsfw_indices"].forEach((index) => {
      const img = document.querySelector(`.image-${index}`);
      if (img) img.classList.add("explicit-image");
    });
  } catch (error) {
    console.error("Error analyzing images:", error);
  }
}
async function analyzeImagesMutation(imageData) {
  try {
    const response = await fetch(`${API_URL}/analyze-images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: imageData }),
    });

    const flaggedImages = await response.json(); // Backend returns flagged indices

    // Inject styles for explicit images
    const style = document.createElement("style");
    style.textContent = `
      .explicit-image {
        filter: blur(10px); /* Blur effect */
        transition: filter 0.3s ease-in-out;
      }
      .explicit-image:hover {
        filter: none; /* Allow users to view on hover if needed */
      }
    `;
    document.head.appendChild(style);

    // Apply blur to flagged images
    flaggedImages["nsfw_indices"].forEach((index) => {
      const img = document.querySelector(`.image-${index}`);
      if (img) img.classList.add("explicit-image");
    });
  } catch (error) {
    console.error("Error analyzing images:", error);
  }
}
