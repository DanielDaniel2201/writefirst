import { DEFAULT_SETTINGS, getSettings, normalizeSettings, saveSettings, type ExtensionSettings } from "./shared/settings";

const form = document.getElementById("settings-form") as HTMLFormElement;
const enabled = document.getElementById("enabled") as HTMLInputElement;
const sourceLanguage = document.getElementById("sourceLanguage") as HTMLInputElement;
const targetLanguage = document.getElementById("targetLanguage") as HTMLInputElement;
const baseUrl = document.getElementById("baseUrl") as HTMLInputElement;
const model = document.getElementById("model") as HTMLInputElement;
const apiKey = document.getElementById("apiKey") as HTMLInputElement;
const status = document.getElementById("status") as HTMLParagraphElement;

void hydrate();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void persist();
});

enabled.addEventListener("change", () => {
  void persist("Saved.");
});

async function hydrate(): Promise<void> {
  applySettings(await getSettings());
}

async function persist(message = "Settings saved."): Promise<void> {
  const settings = normalizeSettings({
    ...DEFAULT_SETTINGS,
    enabled: enabled.checked,
    sourceLanguage: sourceLanguage.value,
    targetLanguage: targetLanguage.value,
    baseUrl: baseUrl.value,
    model: model.value,
    apiKey: apiKey.value
  });

  await saveSettings(settings);
  applySettings(settings);
  setStatus(message);
}

function applySettings(settings: ExtensionSettings): void {
  enabled.checked = settings.enabled;
  sourceLanguage.value = settings.sourceLanguage;
  targetLanguage.value = settings.targetLanguage;
  baseUrl.value = settings.baseUrl;
  model.value = settings.model;
  apiKey.value = settings.apiKey;
}

function setStatus(message: string): void {
  status.textContent = message;
  window.setTimeout(() => {
    if (status.textContent === message) {
      status.textContent = "";
    }
  }, 1800);
}
