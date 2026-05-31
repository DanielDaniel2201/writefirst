export type ProviderMode = "openai-compatible";

export interface ExtensionSettings {
  enabled: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  providerMode: ProviderMode;
  baseUrl: string;
  model: string;
  apiKey: string;
  idleMs: number;
  minChars: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  sourceLanguage: "Chinese",
  targetLanguage: "English",
  providerMode: "openai-compatible",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  apiKey: "",
  idleMs: 800,
  minChars: 2
};

export function normalizeSettings(value: Partial<ExtensionSettings> | undefined): ExtensionSettings {
  const settings = { ...DEFAULT_SETTINGS, ...value };

  return {
    ...settings,
    enabled: Boolean(settings.enabled),
    sourceLanguage: nonEmpty(settings.sourceLanguage, DEFAULT_SETTINGS.sourceLanguage),
    targetLanguage: nonEmpty(settings.targetLanguage, DEFAULT_SETTINGS.targetLanguage),
    providerMode: "openai-compatible",
    baseUrl: trimTrailingSlash(nonEmpty(settings.baseUrl, DEFAULT_SETTINGS.baseUrl)),
    model: nonEmpty(settings.model, DEFAULT_SETTINGS.model),
    apiKey: settings.apiKey?.trim() ?? "",
    idleMs: Math.max(250, Number(settings.idleMs) || DEFAULT_SETTINGS.idleMs),
    minChars: Math.max(1, Number(settings.minChars) || DEFAULT_SETTINGS.minChars)
  };
}

export async function getSettings(): Promise<ExtensionSettings> {
  const value = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return normalizeSettings(value);
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.sync.set(normalizeSettings(settings));
}

function nonEmpty(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
