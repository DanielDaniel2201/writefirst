import {
  DEFAULT_SETTINGS,
  IDLE_DELAY_MAX_MS,
  IDLE_DELAY_MIN_MS,
  IDLE_DELAY_STEP_MS,
  getSettings,
  normalizeSettings,
  saveSettings,
  type ExtensionSettings
} from "./shared/settings";

const form = document.getElementById("settings-form") as HTMLFormElement;
const enabled = document.getElementById("enabled") as HTMLInputElement;
const sourceLanguage = document.getElementById("sourceLanguage") as HTMLInputElement;
const targetLanguage = document.getElementById("targetLanguage") as HTMLInputElement;
const idleDelay = document.getElementById("idleDelay") as HTMLInputElement;
const idleDelayValue = document.getElementById("idleDelayValue") as HTMLOutputElement;
const baseUrl = document.getElementById("baseUrl") as HTMLInputElement;
const model = document.getElementById("model") as HTMLInputElement;
const apiKey = document.getElementById("apiKey") as HTMLInputElement;
const status = document.getElementById("status") as HTMLParagraphElement;

idleDelay.min = String(IDLE_DELAY_MIN_MS);
idleDelay.max = String(IDLE_DELAY_MAX_MS);
idleDelay.step = String(IDLE_DELAY_STEP_MS);

void hydrate();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void persist();
});

enabled.addEventListener("change", () => {
  void persist("Saved.");
});

idleDelay.addEventListener("input", () => {
  updateIdleDelayValue(Number(idleDelay.value));
});

idleDelay.addEventListener("change", () => {
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
    idleMs: Number(idleDelay.value),
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
  idleDelay.value = String(settings.idleMs);
  updateIdleDelayValue(settings.idleMs);
  baseUrl.value = settings.baseUrl;
  model.value = settings.model;
  apiKey.value = settings.apiKey;
}

function updateIdleDelayValue(valueMs: number): void {
  idleDelayValue.value = `${(valueMs / 1000).toFixed(1)}s`;
}

function setStatus(message: string): void {
  status.textContent = message;
  window.setTimeout(() => {
    if (status.textContent === message) {
      status.textContent = "";
    }
  }, 1800);
}
