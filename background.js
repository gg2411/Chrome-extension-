// Sentence Explainer - Background Service Worker

const DEFAULT_SETTINGS = {
  provider: "openai",
  apiKey: "",
  model: "gpt-4o-mini",
  customEndpoint: "",
  useCustomPrompt: false,
  customPrompt: "",
};

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      resolve(settings);
    });
  });
}

const DEFAULT_PROMPT_TEMPLATE = `You are a concise explainer. The user highlighted the following text and wants to understand what it means in context.

The user is reading a page on {{pageDomain}} titled "{{pageTitle}}".
Surrounding text for context:
"{{surroundingContext}}"

Highlighted text:
"{{selectedText}}"

Provide a clear, concise explanation (2-4 sentences). Focus on what this means in the specific context of the page. If it's jargon or a domain-specific term, explain it in plain language. Do not repeat the highlighted text back. Do not use filler phrases like "This refers to..." — just explain directly.`;

function buildPrompt(payload, settings) {
  const template = settings.useCustomPrompt && settings.customPrompt
    ? settings.customPrompt
    : DEFAULT_PROMPT_TEMPLATE;

  return template
    .replace(/\{\{selectedText\}\}/g, payload.selectedText || "")
    .replace(/\{\{surroundingContext\}\}/g, payload.surroundingContext || "")
    .replace(/\{\{pageTitle\}\}/g, payload.pageTitle || "")
    .replace(/\{\{pageDomain\}\}/g, payload.pageDomain || "")
    .replace(/\{\{pageUrl\}\}/g, payload.pageUrl || "");
}

async function callOpenAI(settings, prompt) {
  const endpoint = settings.customEndpoint
    ? `${settings.customEndpoint.replace(/\/+$/, "")}/v1/chat/completions`
    : "https://api.openai.com/v1/chat/completions";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "No explanation returned.";
}

async function callAnthropic(settings, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: settings.model || "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text?.trim() || "No explanation returned.";
}

async function getExplanation(payload) {
  const settings = await getSettings();

  if (!settings.apiKey) {
    throw new Error(
      "No API key configured. Right-click the extension icon → Options to set one up."
    );
  }

  const prompt = buildPrompt(payload, settings);

  if (settings.provider === "anthropic") {
    return callAnthropic(settings, prompt);
  }
  return callOpenAI(settings, prompt);
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "EXPLAIN") return false;

  getExplanation(message.payload)
    .then((explanation) => sendResponse({ explanation }))
    .catch((err) => sendResponse({ error: err.message }));

  // Return true to indicate async response
  return true;
});
