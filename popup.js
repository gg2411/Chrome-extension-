// Popup logic - shows status and links to settings

const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const openOptions = document.getElementById("open-options");

chrome.storage.sync.get({ apiKey: "", provider: "openai" }, (settings) => {
  if (settings.apiKey) {
    statusDot.classList.add("ok");
    const providerName =
      settings.provider === "anthropic" ? "Anthropic" :
      settings.provider === "custom" ? "Custom" : "OpenAI";
    statusText.textContent = `Connected to ${providerName}`;
  } else {
    statusDot.classList.add("err");
    statusText.textContent = "No API key set";
  }
});

openOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
