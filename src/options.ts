import { EXCERPTS_STORAGE_KEY, getExcerpts, normalizeExcerpts } from "./shared/excerpts";
import { getPageCount, getPageItems, getPaginationItems } from "./options/pagination";
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
const thinkingEnabled = document.getElementById("thinkingEnabled") as HTMLInputElement;
const apiKey = document.getElementById("apiKey") as HTMLInputElement;
const status = document.getElementById("status") as HTMLParagraphElement;
const excerptList = document.getElementById("excerpt-list") as HTMLTableSectionElement;
const excerptCount = document.getElementById("excerpt-count") as HTMLElement;
const excerptTable = document.getElementById("excerpt-table") as HTMLDivElement;
const emptyState = document.getElementById("empty-state") as HTMLDivElement;
const pagination = document.getElementById("pagination") as HTMLElement;
const navItems = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-view]"));
const panels = Array.from(document.querySelectorAll<HTMLElement>("[data-panel]"));
const PAGE_SIZE = 10;

let excerpts = normalizeExcerpts([]);
let currentPage = 1;

idleDelay.min = String(IDLE_DELAY_MIN_MS);
idleDelay.max = String(IDLE_DELAY_MAX_MS);
idleDelay.step = String(IDLE_DELAY_STEP_MS);

void hydrate();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void persist();
});

enabled.addEventListener("change", () => {
  void persist("已保存");
});

idleDelay.addEventListener("input", () => {
  updateIdleDelayValue(Number(idleDelay.value));
});

idleDelay.addEventListener("change", () => {
  void persist("已保存");
});

for (const navItem of navItems) {
  navItem.addEventListener("click", () => showView(navItem.dataset.view ?? "excerpts"));
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && EXCERPTS_STORAGE_KEY in changes) {
    currentPage = 1;
    setExcerpts(changes[EXCERPTS_STORAGE_KEY].newValue);
  }
});

async function hydrate(): Promise<void> {
  const [settings, excerpts] = await Promise.all([getSettings(), getExcerpts()]);
  applySettings(settings);
  setExcerpts(excerpts);
  showView(location.hash === "#settings" ? "settings" : "excerpts");
}

async function persist(message = "设置已保存"): Promise<void> {
  const settings = normalizeSettings({
    ...DEFAULT_SETTINGS,
    enabled: enabled.checked,
    sourceLanguage: sourceLanguage.value,
    targetLanguage: targetLanguage.value,
    idleMs: Number(idleDelay.value),
    baseUrl: baseUrl.value,
    model: model.value,
    thinkingEnabled: thinkingEnabled.checked,
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
  thinkingEnabled.checked = settings.thinkingEnabled;
  apiKey.value = settings.apiKey;
}

function showView(viewName: string): void {
  const activeView = viewName === "settings" ? "settings" : "excerpts";

  for (const navItem of navItems) {
    const isActive = navItem.dataset.view === activeView;
    navItem.classList.toggle("is-active", isActive);
    navItem.setAttribute("aria-current", isActive ? "page" : "false");
  }

  for (const panel of panels) {
    panel.hidden = panel.dataset.panel !== activeView;
  }

  history.replaceState(null, "", `#${activeView}`);
}

function setExcerpts(value: unknown): void {
  excerpts = normalizeExcerpts(value).reverse();
  currentPage = Math.min(currentPage, Math.max(1, getPageCount(excerpts.length, PAGE_SIZE)));
  renderExcerpts();
}

function renderExcerpts(): void {
  excerptCount.textContent = String(excerpts.length);
  excerptList.replaceChildren();
  const hasExcerpts = excerpts.length > 0;
  emptyState.hidden = hasExcerpts;
  excerptTable.hidden = !hasExcerpts;

  for (const excerpt of getPageItems(excerpts, currentPage, PAGE_SIZE)) {
    const row = document.createElement("tr");

    const timeCell = document.createElement("td");
    const time = document.createElement("time");
    time.dateTime = excerpt.createdAt;
    time.textContent = formatTimestamp(excerpt.createdAt);
    timeCell.append(time);

    const textCell = document.createElement("td");
    textCell.textContent = excerpt.text;

    row.append(timeCell, textCell);
    excerptList.append(row);
  }

  renderPagination();
}

function renderPagination(): void {
  const pageCount = getPageCount(excerpts.length, PAGE_SIZE);
  pagination.replaceChildren();
  pagination.hidden = pageCount <= 1;

  if (pageCount <= 1) {
    return;
  }

  for (const item of getPaginationItems(currentPage, pageCount)) {
    if (item === "ellipsis") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "pagination__ellipsis";
      ellipsis.textContent = "…";
      pagination.append(ellipsis);
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(item);
    button.setAttribute("aria-label", `第 ${item} 页`);

    if (item === currentPage) {
      button.className = "is-active";
      button.setAttribute("aria-current", "page");
    }

    button.addEventListener("click", () => {
      currentPage = item;
      renderExcerpts();
      excerptTable.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    pagination.append(button);
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

function updateIdleDelayValue(valueMs: number): void {
  idleDelayValue.value = `${(valueMs / 1000).toFixed(1)} 秒`;
}

function setStatus(message: string): void {
  status.textContent = message;
  window.setTimeout(() => {
    if (status.textContent === message) {
      status.textContent = "";
    }
  }, 1800);
}
