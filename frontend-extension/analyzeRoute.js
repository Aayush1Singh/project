export async function analyzeRoute() {
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
