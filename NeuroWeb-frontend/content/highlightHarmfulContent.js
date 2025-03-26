//highlighting harmful text
export function highlightHarmfulContent(harmfulSections) {
  harmfulSections.forEach((id) => {
    const element = document.querySelector(`.data-original-id${id.slice(3)}`);
    if (element) {
      element.style.position = "relative";
      element.style.color = "transparent"; // Hide text
      element.style.backgroundColor = "rgba(255, 0, 0, 0.8)"; // Red overlay
      element.style.backdropFilter = "blur(8px)"; // Modern blur effect
      element.style.borderRadius = "8px"; // Soft rounded corners
      element.style.padding = "2px 5px"; // Clean spacing
      element.style.cursor = "not-allowed"; // Indicate restricted content
      element.addEventListener("mouseover", () => {
        element.style.color = "white"; // Text appears
        element.style.backgroundColor = "rgba(255, 0, 0, 0.9)";
      });

      element.addEventListener("mouseout", () => {
        element.style.color = "transparent"; // Text re-hidden
        element.style.backgroundColor = "rgba(255, 0, 0, 0.8)";
      });
    }
  });
}
