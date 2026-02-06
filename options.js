// Options page logic

const providerEl = document.getElementById("provider");
const apiKeyEl = document.getElementById("api-key");
const modelEl = document.getElementById("model");
const customEndpointEl = document.getElementById("custom-endpoint");
const customEndpointGroup = document.getElementById("custom-endpoint-group");
const modelHint = document.getElementById("model-hint");
const useCustomPromptEl = document.getElementById("use-custom-prompt");
const customPromptEl = document.getElementById("custom-prompt");
const customPromptGroup = document.getElementById("custom-prompt-group");
const defaultPromptPreview = document.getElementById("default-prompt-preview");
const saveBtn = document.getElementById("save");
const statusEl = document.getElementById("status");

const MODEL_HINTS = {
  openai: "e.g. gpt-4o-mini, gpt-4o, gpt-3.5-turbo",
  anthropic: "e.g. claude-sonnet-4-20250514, claude-haiku-4-20250414",
  custom: "Model name supported by your endpoint",
};

const DEFAULT_MODELS = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
  custom: "",
};

const DEFAULT_PROMPT = `You are a concise explainer. The user highlighted the following text and wants to understand what it means in context.

The user is reading a page on {{pageDomain}} titled "{{pageTitle}}".
Surrounding text for context:
"{{surroundingContext}}"

Highlighted text:
"{{selectedText}}"

Provide a clear, concise explanation (2-4 sentences). Focus on what this means in the specific context of the page. If it's jargon or a domain-specific term, explain it in plain language. Do not repeat the highlighted text back. Do not use filler phrases like "This refers to..." — just explain directly.`;

// Show default prompt preview
defaultPromptPreview.textContent = DEFAULT_PROMPT;

function updateUI() {
  const provider = providerEl.value;
  customEndpointGroup.style.display = provider === "custom" ? "block" : "none";
  modelHint.textContent = MODEL_HINTS[provider] || "";
  apiKeyEl.placeholder = provider === "anthropic" ? "sk-ant-..." : "sk-...";
  customPromptGroup.style.display = useCustomPromptEl.checked ? "block" : "none";
}

providerEl.addEventListener("change", () => {
  updateUI();
  if (!modelEl.value || Object.values(DEFAULT_MODELS).includes(modelEl.value)) {
    modelEl.value = DEFAULT_MODELS[providerEl.value] || "";
  }
});

useCustomPromptEl.addEventListener("change", updateUI);

// Load saved settings
chrome.storage.sync.get(
  { provider: "openai", apiKey: "", model: "", customEndpoint: "", useCustomPrompt: false, customPrompt: "" },
  (settings) => {
    providerEl.value = settings.provider;
    apiKeyEl.value = settings.apiKey;
    modelEl.value = settings.model;
    customEndpointEl.value = settings.customEndpoint;
    useCustomPromptEl.checked = settings.useCustomPrompt;
    customPromptEl.value = settings.customPrompt || DEFAULT_PROMPT;
    updateUI();
  }
);

// Save
saveBtn.addEventListener("click", () => {
  const settings = {
    provider: providerEl.value,
    apiKey: apiKeyEl.value.trim(),
    model: modelEl.value.trim() || DEFAULT_MODELS[providerEl.value] || "gpt-4o-mini",
    customEndpoint: customEndpointEl.value.trim(),
    useCustomPrompt: useCustomPromptEl.checked,
    customPrompt: customPromptEl.value,
  };

  chrome.storage.sync.set(settings, () => {
    statusEl.classList.add("show");
    setTimeout(() => statusEl.classList.remove("show"), 1500);
  });
});
