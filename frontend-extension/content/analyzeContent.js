import { highlightHarmfulContent } from "./highlightHarmfulContent";
//flatten The website
export function flattenContent(
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
export async function extractPageContent() {
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
  // assigning a unique id to each tag
  var y = 0;
  elements.forEach((el, index) => {
    el.setAttribute("data-original-id", `${index}`);
    el.classList.add(`data-original-id${index}`);
    y++;
  });

  await chrome.storage.local.set({ lastIndex: y });
  //clonning document
  const documentClone = document.cloneNode(true);
  //attaching a finger print to each paragraph.
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
  newDoc.body.innerHTML = flattenedDOM.innerHTML; // flattenedDOM from your flattenContent function
  //parsing the document
  const article = new Readability(newDoc).parse();
  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(article.content, "text/html");
  // Extract all text content
  var allTextContent = parsedDocument.body.innerText.trim();

  //trimming down if any unwanted spaces.
  allTextContent = allTextContent.replace(/\s+/g, " ");
  return {
    text: allTextContent,
  };
}
export async function analyzeContent() {
  const { text } = await extractPageContent();
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
  const response = await fetch("http://127.0.0.1:5000/analyze-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "text", // Change this based on the data type: "url", "image", or "text"
      text,
    }),
  });
  const { output } = await response.json();
  highlightHarmfulContent(output.split("\n"));
}
