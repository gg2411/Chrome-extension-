// Options page logic

const providerEl = document.getElementById("provider");
const apiKeyEl = document.getElementById("api-key");
const modelEl = document.getElementById("model");
const customEndpointEl = document.getElementById("custom-endpoint");
const customEndpointGroup = document.getElementById("custom-endpoint-group");
const modelHint = document.getElementById("model-hint");
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

function updateUI() {
  const provider = providerEl.value;
  customEndpointGroup.style.display = provider === "custom" ? "block" : "none";
  modelHint.textContent = MODEL_HINTS[provider] || "";
  apiKeyEl.placeholder = provider === "anthropic" ? "sk-ant-..." : "sk-...";
}

providerEl.addEventListener("change", () => {
  updateUI();
  // Update model placeholder/default when switching providers
  if (!modelEl.value || Object.values(DEFAULT_MODELS).includes(modelEl.value)) {
    modelEl.value = DEFAULT_MODELS[providerEl.value] || "";
  }
});

// Load saved settings
chrome.storage.sync.get(
  { provider: "openai", apiKey: "", model: "", customEndpoint: "" },
  (settings) => {
    providerEl.value = settings.provider;
    apiKeyEl.value = settings.apiKey;
    modelEl.value = settings.model;
    customEndpointEl.value = settings.customEndpoint;
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
  };

  chrome.storage.sync.set(settings, () => {
    statusEl.classList.add("show");
    setTimeout(() => statusEl.classList.remove("show"), 1500);
  });
});
