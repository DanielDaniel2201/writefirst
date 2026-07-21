import { translateWithOpenAICompatible } from "./background/openaiCompatible";
import { addExcerpt } from "./shared/excerpts";
import type { RuntimeMessage, RuntimeResponse, TranslateTextMessage } from "./shared/messages";
import { getSettings } from "./shared/settings";

void chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: RuntimeResponse) => void
  ) => {
    if (message.type === "RECORD_EXCERPT") {
      void addExcerpt(message.text)
        .then(() => sendResponse({ ok: true }))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Could not save excerpt.";
          sendResponse({ ok: false, error: message });
        });

      return true;
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

async function handleTranslate(message: TranslateTextMessage): Promise<string> {
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
