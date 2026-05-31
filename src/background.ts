import { translateWithOpenAICompatible } from "./background/openaiCompatible";
import type { RuntimeMessage, TranslateTextResponse } from "./shared/messages";
import { getSettings } from "./shared/settings";

chrome.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: TranslateTextResponse) => void
  ) => {
    if (message.type !== "TRANSLATE_TEXT") {
      return false;
    }

    void handleTranslate(message)
      .then((translation) => sendResponse({ ok: true, translation }))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Translation failed.";
        sendResponse({ ok: false, error: message });
      });

    return true;
  }
);

async function handleTranslate(message: RuntimeMessage): Promise<string> {
  const settings = await getSettings();

  if (!settings.enabled) {
    throw new Error("Extension is disabled.");
  }

  const text = message.text.trim();
  if (!text) {
    throw new Error("No text to translate.");
  }

  return translateWithOpenAICompatible(settings, text, message.sourceLanguage, message.targetLanguage);
}
