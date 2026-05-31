import { TranslationCard } from "./content/card";
import {
  type EditableElement,
  getEditableText,
  hasMinimumVisibleChars,
  isActiveEditable,
  isEligibleEditableElement,
  resolveActiveEditableTarget,
  resolveEditableTarget,
  resolveSelectionEditableTarget
} from "./content/editable";
import type { TranslateTextResponse } from "./shared/messages";
import { DEFAULT_SETTINGS, getSettings, normalizeSettings, type ExtensionSettings } from "./shared/settings";

type CleanupGlobal = typeof globalThis & {
  __writeFirstCleanup__?: () => void;
};

const card = new TranslationCard();

let settings: ExtensionSettings = DEFAULT_SETTINGS;
let activeEditable: EditableElement | null = null;
let debounceId = 0;
let requestId = 0;
let isComposing = false;
let lastScheduledText = "";
let lastScheduledElement: EditableElement | null = null;
let lastRequestedText = "";
let lastRequestedElement: EditableElement | null = null;
let lastCompletedText = "";
let lastCompletedElement: EditableElement | null = null;

void init();

async function init(): Promise<void> {
  const cleanupGlobal = globalThis as CleanupGlobal;
  cleanupGlobal.__writeFirstCleanup__?.();

  settings = await getSettings();
  cleanupGlobal.__writeFirstCleanup__ = registerListeners();
}

function registerListeners(): () => void {
  document.addEventListener("focusin", handleFocusIn, true);
  document.addEventListener("focusout", handleFocusOut, true);
  document.addEventListener("beforeinput", handleBeforeInput, true);
  document.addEventListener("input", handleInput, true);
  document.addEventListener("keyup", handleKeyUp, true);
  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("mousedown", handlePointerDown, true);
  document.addEventListener("click", handlePointerDown, true);
  document.addEventListener("compositionstart", handleCompositionStart, true);
  document.addEventListener("compositionend", handleCompositionEnd, true);
  document.addEventListener("selectionchange", handleSelectionChange, true);
  window.addEventListener("scroll", handleViewportChange, true);
  window.addEventListener("resize", handleViewportChange, true);

  const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string): void => {
    if (areaName !== "sync") {
      return;
    }

    const next = { ...settings };

    for (const [key, change] of Object.entries(changes)) {
      if (key in DEFAULT_SETTINGS) {
        Object.assign(next, { [key]: change.newValue });
      }
    }

    settings = normalizeSettings(next);

    if (!settings.enabled) {
      clearPending();
      hideCardAndInvalidate();
      return;
    }

    if (activeEditable && isEligibleEditableElement(activeEditable) && isActiveEditable(activeEditable)) {
      scheduleTranslation(activeEditable);
    }
  };

  chrome.storage.onChanged.addListener(handleStorageChange);

  const observer = new MutationObserver(handleDocumentMutation);
  observer.observe(document.documentElement, {
    childList: true,
    characterData: true,
    subtree: true
  });

  return () => {
    document.removeEventListener("focusin", handleFocusIn, true);
    document.removeEventListener("focusout", handleFocusOut, true);
    document.removeEventListener("beforeinput", handleBeforeInput, true);
    document.removeEventListener("input", handleInput, true);
    document.removeEventListener("keyup", handleKeyUp, true);
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("mousedown", handlePointerDown, true);
    document.removeEventListener("click", handlePointerDown, true);
    document.removeEventListener("compositionstart", handleCompositionStart, true);
    document.removeEventListener("compositionend", handleCompositionEnd, true);
    document.removeEventListener("selectionchange", handleSelectionChange, true);
    window.removeEventListener("scroll", handleViewportChange, true);
    window.removeEventListener("resize", handleViewportChange, true);
    chrome.storage.onChanged.removeListener?.(handleStorageChange);
    observer.disconnect();
    clearPending();
    card.remove();
  };
}

function handleFocusIn(event: FocusEvent): void {
  const target = resolveEventEditableTarget(event.target);
  const nextEditable = isEligibleEditableElement(target) ? target : null;

  if (!nextEditable) {
    if (!isDocumentShell(event.target)) {
      activeEditable = null;
      clearPending();
      hideCardAndInvalidate();
    }
    return;
  }

  activeEditable = nextEditable;

  if (!isComposing) {
    scheduleTranslation(activeEditable);
  }
}

function handleFocusOut(event: FocusEvent): void {
  if (activeEditable && event.target instanceof Node && activeEditable.contains(event.target)) {
    window.setTimeout(() => {
      const nextEditable = resolveActiveEditableTarget();

      if (nextEditable && nextEditable !== activeEditable) {
        clearPending();
        hideCardAndInvalidate();
        activeEditable = null;
      }
    }, 0);
  }
}

function handlePointerDown(event: Event): void {
  if (isPublishAction(event.target)) {
    clearPending();
    hideCardAndInvalidate();
    activeEditable = null;
    return;
  }

  if (!activeEditable || !(event.target instanceof Node) || activeEditable.contains(event.target)) {
    return;
  }

  clearPending();
  hideCardAndInvalidate();
  activeEditable = null;
}

function handleCompositionStart(event: CompositionEvent): void {
  if (resolveEventEditableTarget(event.target) === activeEditable) {
    isComposing = true;
    clearPending();
    hideCardAndInvalidate();
  }
}

function handleCompositionEnd(event: CompositionEvent): void {
  const target = resolveEventEditableTarget(event.target) ?? activeEditable;
  isComposing = false;

  if (target && isEligibleEditableElement(target)) {
    activeEditable = target;
    scheduleTranslation(target);
  }
}

function handleBeforeInput(event: InputEvent): void {
  window.setTimeout(() => {
    refreshEditableFromCurrentContext(event.target);
  }, 0);
}

function handleInput(event: Event): void {
  const target = resolveEventEditableTarget(event.target);

  if (!isEligibleEditableElement(target)) {
    clearPending();
    hideCardAndInvalidate();
    activeEditable = null;
    return;
  }

  activeEditable = target;
  hideCardAndInvalidate();

  if (!isComposing) {
    scheduleTranslation(target);
  }
}

function handleKeyUp(event: KeyboardEvent): void {
  if (isComposing || event.isComposing) {
    return;
  }

  refreshEditableFromCurrentContext(event.target);
}

function handleSelectionChange(): void {
  if (isComposing) {
    return;
  }

  refreshEditableFromCurrentContext(null);
}

function handleViewportChange(): void {
  card.repositionSoon();
}

function scheduleTranslation(element: EditableElement): void {
  if (!settings.enabled || !isEligibleEditableElement(element)) {
    return;
  }

  const text = getEditableText(element).trim();
  if (!hasMinimumVisibleChars(text, settings.minChars)) {
    return;
  }

  if (
    (element === lastScheduledElement && text === lastScheduledText) ||
    (element === lastRequestedElement && text === lastRequestedText) ||
    (element === lastCompletedElement && text === lastCompletedText)
  ) {
    return;
  }

  clearPending();
  lastScheduledText = text;
  lastScheduledElement = element;
  debounceId = window.setTimeout(() => {
    void requestTranslation(element, text);
  }, settings.idleMs);
}

async function requestTranslation(element: EditableElement, text: string): Promise<void> {
  if (!settings.enabled || activeEditable !== element || !isEligibleEditableElement(element)) {
    return;
  }

  const id = ++requestId;
  lastRequestedText = text;
  lastRequestedElement = element;
  lastScheduledText = "";
  lastScheduledElement = null;
  card.show(element, "Translating...", "loading");

  let response: TranslateTextResponse;

  try {
    response = (await chrome.runtime.sendMessage({
      type: "TRANSLATE_TEXT",
      text,
      sourceLanguage: settings.sourceLanguage,
      targetLanguage: settings.targetLanguage
    })) as TranslateTextResponse;
  } catch (error) {
    showFailureIfCurrent(id, element, text, errorMessage(error));
    return;
  }

  if (!response) {
    showFailureIfCurrent(id, element, text, "No response from the extension background worker.");
    return;
  }

  if (id !== requestId || activeEditable !== element) {
    return;
  }

  const currentText = getEditableText(element).trim();

  if (currentText !== lastRequestedText) {
    if (!hasMinimumVisibleChars(currentText, settings.minChars)) {
      clearPending();
      hideCardAndInvalidate();
    }

    return;
  }

  if (!response.ok) {
    card.show(element, `Translation failed: ${response.error}`, "error");
    return;
  }

  lastCompletedText = text;
  lastCompletedElement = element;
  card.show(element, response.translation);
}

function resolveEventEditableTarget(target: EventTarget | null): EditableElement | null {
  return resolveEditableTarget(target) ?? resolveActiveEditableTarget() ?? resolveSelectionEditableTarget();
}

function refreshEditableFromCurrentContext(target: EventTarget | null): void {
  const editable = resolveEventEditableTarget(target);

  if (!isEligibleEditableElement(editable)) {
    return;
  }

  activeEditable = editable;
  scheduleTranslation(editable);
}

function handleDocumentMutation(): void {
  if (!activeEditable) {
    card.hide();
    return;
  }

  if (!activeEditable.isConnected || !isEligibleEditableElement(activeEditable)) {
    clearPending();
    hideCardAndInvalidate();
    activeEditable = null;
    return;
  }

  const currentText = getEditableText(activeEditable).trim();

  if (!hasMinimumVisibleChars(currentText, settings.minChars)) {
    clearPending();
    hideCardAndInvalidate();
  }
}

function isDocumentShell(target: EventTarget | null): boolean {
  return target === document.body || target === document.documentElement;
}

function isPublishAction(target: EventTarget | null): boolean {
  const element = eventTargetToElement(target);
  const action = element?.closest<HTMLElement>(
    'button, [role="button"], [data-testid="tweetButton"], [data-testid="tweetButtonInline"]'
  );

  if (!action) {
    return false;
  }

  const testId = action.getAttribute("data-testid");
  if (testId === "tweetButton" || testId === "tweetButtonInline") {
    return true;
  }

  const label = [
    action.getAttribute("aria-label"),
    action.getAttribute("data-testid"),
    action.getAttribute("title"),
    action.textContent
  ]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase();

  return /post|tweet|reply/.test(label);
}

function eventTargetToElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) {
    return target;
  }

  return target instanceof Text ? target.parentElement : null;
}

function showFailureIfCurrent(id: number, element: EditableElement, text: string, message: string): void {
  if (
    id !== requestId ||
    activeEditable !== element ||
    getEditableText(element).trim() !== text
  ) {
    return;
  }

  card.show(element, `Translation failed: ${message}`, "error");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

function clearPending(): void {
  if (debounceId) {
    window.clearTimeout(debounceId);
    debounceId = 0;
  }
}

function hideCardAndInvalidate(): void {
  requestId += 1;
  lastScheduledText = "";
  lastScheduledElement = null;
  lastRequestedText = "";
  lastRequestedElement = null;
  lastCompletedText = "";
  lastCompletedElement = null;
  card.hide();
}
