import type { ExtensionSettings } from "../shared/settings";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

export interface TranslationRequest {
  url: string;
  init: RequestInit;
}

export function buildTranslationRequest(
  settings: ExtensionSettings,
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): TranslationRequest {
  const endpoint = chatCompletionsEndpoint(settings.baseUrl);
  const body = {
    model: settings.model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          `You translate user-provided text for language learning. ` +
          `Return only a natural translation in ${targetLanguage}. ` +
          `Do not include explanations, alternatives, quotation marks, or notes.`
      },
      {
        role: "user",
        content: `Translate from ${sourceLanguage} to ${targetLanguage}:\n\n${text}`
      }
    ]
  };

  return {
    url: endpoint,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify(body)
    }
  };
}

export async function translateWithOpenAICompatible(
  settings: ExtensionSettings,
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  if (!settings.apiKey) {
    throw new Error("API key is not configured.");
  }

  const request = buildTranslationRequest(settings, text, sourceLanguage, targetLanguage);
  const response = await fetch(request.url, request.init);
  const payload = (await response.json().catch(() => ({}))) as ChatCompletionResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || `Translation request failed with ${response.status}.`);
  }

  return extractTranslation(payload);
}

export function extractTranslation(payload: ChatCompletionResponse): string {
  const translation = payload.choices?.[0]?.message?.content?.trim();

  if (!translation) {
    throw new Error("Translation response did not include text.");
  }

  return translation;
}

function chatCompletionsEndpoint(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}
