export type ProviderMode = "openai-compatible";

export const IDLE_DELAY_MIN_MS = 800;
export const IDLE_DELAY_MAX_MS = 1500;
export const IDLE_DELAY_STEP_MS = 100;

export interface ExtensionSettings {
  enabled: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  providerMode: ProviderMode;
  baseUrl: string;
  model: string;
  thinkingEnabled: boolean;
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
  thinkingEnabled: false,
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
    thinkingEnabled: Boolean(settings.thinkingEnabled),
    apiKey: settings.apiKey?.trim() ?? "",
    idleMs: normalizeIdleMs(settings.idleMs),
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

function normalizeIdleMs(value: number | undefined): number {
  const numeric = Number(value) || DEFAULT_SETTINGS.idleMs;
  const clamped = Math.min(IDLE_DELAY_MAX_MS, Math.max(IDLE_DELAY_MIN_MS, numeric));
  return Math.round(clamped / IDLE_DELAY_STEP_MS) * IDLE_DELAY_STEP_MS;
}
