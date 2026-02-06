(() => {
  "use strict";

  let tooltipEl = null;
  let currentRequest = null;

  // --- Tooltip management ---

  function createTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement("div");
    tooltipEl.id = "se-tooltip";
    tooltipEl.className = "se-tooltip";
    tooltipEl.innerHTML = `
      <div class="se-tooltip-header">
        <span class="se-tooltip-title">Sentence Explainer</span>
        <button class="se-tooltip-close" aria-label="Close">&times;</button>
      </div>
      <div class="se-tooltip-body">
        <div class="se-tooltip-loading">
          <div class="se-spinner"></div>
          <span>Thinking...</span>
        </div>
        <div class="se-tooltip-content" hidden></div>
      </div>
    `;
    document.body.appendChild(tooltipEl);

    tooltipEl.querySelector(".se-tooltip-close").addEventListener("click", hideTooltip);
    return tooltipEl;
  }

  function positionTooltip(x, y) {
    const tooltip = createTooltip();
    const padding = 12;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    tooltip.style.opacity = "0";
    tooltip.hidden = false;

    // Let the browser lay it out so we can measure
    requestAnimationFrame(() => {
      const rect = tooltip.getBoundingClientRect();
      let left = x + window.scrollX;
      let top = y + window.scrollY + padding;

      // Flip above if it would go off-screen bottom
      if (y + rect.height + padding > viewportH) {
        top = y + window.scrollY - rect.height - padding;
      }
      // Clamp horizontally
      if (left + rect.width > window.scrollX + viewportW - padding) {
        left = window.scrollX + viewportW - rect.width - padding;
      }
      if (left < window.scrollX + padding) {
        left = window.scrollX + padding;
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      tooltip.style.opacity = "1";
    });
  }

  function showLoading() {
    const tooltip = createTooltip();
    tooltip.querySelector(".se-tooltip-loading").hidden = false;
    tooltip.querySelector(".se-tooltip-content").hidden = true;
    tooltip.querySelector(".se-tooltip-content").textContent = "";
  }

  function showContent(text) {
    const tooltip = createTooltip();
    tooltip.querySelector(".se-tooltip-loading").hidden = true;
    const contentEl = tooltip.querySelector(".se-tooltip-content");
    contentEl.hidden = false;
    contentEl.textContent = "";

    // Render markdown-lite: split paragraphs, handle **bold**
    const paragraphs = text.split(/\n\n+/);
    paragraphs.forEach((p) => {
      const el = document.createElement("p");
      el.innerHTML = p
        .replace(/\n/g, "<br>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/`(.+?)`/g, "<code>$1</code>");
      contentEl.appendChild(el);
    });
  }

  function showError(msg) {
    const tooltip = createTooltip();
    tooltip.querySelector(".se-tooltip-loading").hidden = true;
    const contentEl = tooltip.querySelector(".se-tooltip-content");
    contentEl.hidden = false;
    contentEl.innerHTML = `<p class="se-error">${escapeHtml(msg)}</p>`;
  }

  function hideTooltip() {
    if (tooltipEl) {
      tooltipEl.hidden = true;
      tooltipEl.style.opacity = "0";
    }
    if (currentRequest) {
      currentRequest = null;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Context extraction ---

  function getSurroundingContext(selection) {
    if (!selection.rangeCount) return "";
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;

    // Walk up to a block-level element for context
    while (
      container &&
      container.nodeType !== Node.ELEMENT_NODE
    ) {
      container = container.parentNode;
    }

    // Try to get the nearest meaningful block
    const blockTags = [
      "P", "DIV", "ARTICLE", "SECTION", "LI", "TD",
      "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "H6",
    ];
    while (
      container &&
      container !== document.body &&
      !blockTags.includes(container.tagName)
    ) {
      container = container.parentNode;
    }

    if (container && container !== document.body) {
      const text = container.innerText || container.textContent || "";
      // Limit context to ~500 chars
      return text.slice(0, 500).trim();
    }
    return "";
  }

  function getPageContext() {
    return {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname,
    };
  }

  // --- Middle-click handler ---

  document.addEventListener("auxclick", (e) => {
    // Button 1 = middle click
    if (e.button !== 1) return;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText || selectedText.length < 2) return;

    // Prevent default middle-click behavior (auto-scroll / paste)
    e.preventDefault();
    e.stopPropagation();

    const surroundingContext = getSurroundingContext(selection);
    const pageContext = getPageContext();

    // Show tooltip near the click
    showLoading();
    positionTooltip(e.clientX, e.clientY);

    const requestId = Date.now();
    currentRequest = requestId;

    chrome.runtime.sendMessage(
      {
        type: "EXPLAIN",
        payload: {
          selectedText,
          surroundingContext,
          pageTitle: pageContext.title,
          pageUrl: pageContext.url,
          pageDomain: pageContext.domain,
        },
      },
      (response) => {
        // Ignore if a newer request has been made
        if (currentRequest !== requestId) return;

        if (chrome.runtime.lastError) {
          showError(
            "Could not reach the extension. Try reloading the page."
          );
          return;
        }

        if (response && response.error) {
          showError(response.error);
        } else if (response && response.explanation) {
          showContent(response.explanation);
        } else {
          showError("No response received.");
        }
      }
    );
  });

  // Close tooltip on Escape or clicking outside
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideTooltip();
  });

  document.addEventListener("mousedown", (e) => {
    if (tooltipEl && !tooltipEl.contains(e.target) && e.button === 0) {
      hideTooltip();
    }
  });
})();
