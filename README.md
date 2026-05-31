# Write First

A Chrome Manifest V3 extension for language learning while writing. When a user pauses in a normal text field, the extension shows a read-only translation card under the active input.

## MVP Behavior

- Works on regular `input`, `textarea`, and common `contenteditable` fields.
- Waits 800 ms after typing stops.
- Translates the full field value when it has at least 2 visible characters.
- Shows only the translated text in a passive card.
- Hides the card when the user keeps typing, clears the text, leaves the field, disables the extension, or the field disappears.
- Skips sensitive fields such as password, email, phone, URL, numeric, OTP, and payment-like fields.
- Stores only settings, not input history or translation history.

## Setup

```sh
npm install
npm run build
```

Then open `chrome://extensions`, enable Developer mode, choose "Load unpacked", and select:

```text
D:\projects\write-first\dist
```

## Configure

Open the extension popup and set:

- Enabled
- Native language
- Target language
- API base URL
- Model
- API key

The API must be OpenAI-compatible and expose a `/chat/completions` endpoint. If the base URL already ends with `/chat/completions`, the extension uses it as-is.

## Verify

```sh
npm run verify
```

This runs TypeScript type checking, unit tests, and the extension build.
