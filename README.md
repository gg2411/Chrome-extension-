# Sentence Explainer

A Chrome extension that gives you instant, contextual explanations for highlighted text. Middle-click any selected text to understand what it means — no more copy-pasting into Google or ChatGPT.

## How it works

1. **Highlight** any text on a webpage
2. **Middle-click** (scroll wheel click) on the selection
3. A tooltip appears with a contextual explanation powered by AI

The extension sends the selected text along with surrounding context (paragraph, page title, domain) to your configured AI provider, so explanations are tailored to what you're reading.

## Setup

1. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked** and select this folder
2. Click the extension icon → **Settings**
3. Choose your AI provider (OpenAI, Anthropic, or a custom OpenAI-compatible endpoint)
4. Enter your API key
5. Start highlighting and middle-clicking

## Supported providers

| Provider | Models | Notes |
|----------|--------|-------|
| **OpenAI** | gpt-4o-mini (default), gpt-4o, etc. | Best balance of speed and quality |
| **Anthropic** | claude-sonnet-4-20250514, claude-haiku-4-20250414, etc. | Requires `anthropic-dangerous-direct-browser-access` header |
| **Custom** | Any | Any OpenAI-compatible API endpoint |

## Files

```
manifest.json       - Extension configuration (Manifest V3)
background.js       - Service worker handling API calls
content.js          - Content script detecting selection + middle-click
tooltip.css         - Tooltip styling (scoped with .se- prefix)
popup.html/js       - Toolbar popup with usage instructions
options.html/js     - Settings page for API key configuration
icons/              - Extension icons (16, 48, 128px)
```

## Privacy

- Your API key is stored locally in Chrome sync storage
- Selected text is sent only to your configured AI provider
- No data is collected or sent to any third party
- No analytics or tracking
