//for verification/review of new content on website.
export async function analyzeContentMutation(text) {
  const url = window.location.href;
  const response = await fetch("http://127.0.0.1:5000/analyze-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "text",
      text,
    }),
  });
  const { output } = await response.json();
  highlightHarmfulContent(output.split("\n"));
}

//for observing changes in webpage and
export async function observeDynamicContent() {
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
            console.log(el);
            container.appendChild(el.cloneNode(true));
          });

          newDoc.body.innerHTML += container.innerHTML;
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
      chrome.storage.local.set({ lastIndex: index });
      analyzeContentMutation(allTextContent);
      return { allTextContent };
    }, 1000);
  });

  observer.observe(document.body, {
    childList: true, // Detect new elements added
    subtree: true, // Observe nested elements (important for dynamic content)
  });
}
