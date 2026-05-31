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
const VISIBILITY_ATTRIBUTE_FILTER = ["aria-hidden", "aria-disabled", "aria-readonly", "class", "hidden", "style"];

let settings: ExtensionSettings = DEFAULT_SETTINGS;
let activeEditable: EditableElement | null = null;
let debounceId = 0;
let requestId = 0;
let isComposing = false;
let visibilityObserver: MutationObserver | null = null;
let lastScheduledText = "";
let lastScheduledElement: EditableElement | null = null;
let lastRequestedText = "";
let lastRequestedElement: EditableElement | null = null;
let lastCompletedText = "";
let lastCompletedElement: EditableElement | null = null;
let lastPublishedText = "";
let lastPublishedElement: EditableElement | null = null;

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
    visibilityObserver?.disconnect();
    visibilityObserver = null;
    clearPending();
    card.remove();
  };
}

function handleFocusIn(event: FocusEvent): void {
  const target = resolveEventEditableTarget(event.target);
  const nextEditable = isEligibleEditableElement(target) ? target : null;

  if (!nextEditable) {
    if (!isDocumentShell(event.target)) {
      setActiveEditable(null);
      clearPending();
      hideCardAndInvalidate();
    }
    return;
  }

  setActiveEditable(nextEditable);

  if (!isComposing) {
    scheduleTranslation(nextEditable);
  }
}

function handleFocusOut(event: FocusEvent): void {
  if (activeEditable && event.target instanceof Node && activeEditable.contains(event.target)) {
    window.setTimeout(() => {
      const currentEditable = resolveActiveEditableTarget() ?? resolveSelectionEditableTarget();

      if (activeEditable && currentEditable && currentEditable !== activeEditable) {
        clearActiveEditableState();
        return;
      }

      if (
        activeEditable &&
        (!activeEditable.isConnected ||
          !isEligibleEditableElement(activeEditable) ||
          !hasRenderableEditableBox(activeEditable))
      ) {
        clearActiveEditableState();
      }
    }, 0);
  }
}

function handlePointerDown(event: Event): void {
  if (isTranslationCardTarget(event.target)) {
    return;
  }

  if (isPublishAction(event.target)) {
    suppressPublishedText(resolveEventEditableTarget(event.target) ?? activeEditable);
    clearPending();
    hideCardAndInvalidate();
    setActiveEditable(null);
    return;
  }

  if (!activeEditable || !(event.target instanceof Node) || activeEditable.contains(event.target)) {
    return;
  }

  clearPending();
  hideCardAndInvalidate();
  setActiveEditable(null);
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
    setActiveEditable(target);
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
    setActiveEditable(null);
    return;
  }

  setActiveEditable(target);
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
  if (shouldSuppressPublishedText(element, text)) {
    return;
  }

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

  setActiveEditable(editable);
  scheduleTranslation(editable);
}

function handleDocumentMutation(): void {
  if (!activeEditable) {
    return;
  }

  if (!activeEditable.isConnected || !isEligibleEditableElement(activeEditable)) {
    clearActiveEditableState();
    return;
  }

  if (!hasRenderableEditableBox(activeEditable)) {
    clearActiveEditableState();
    return;
  }

  syncActiveEditableVisibilityObservation();

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

function isTranslationCardTarget(target: EventTarget | null): boolean {
  const element = eventTargetToElement(target);
  return element?.id === "write-first-translation-card-host";
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

function clearActiveEditableState(): void {
  clearPending();
  hideCardAndInvalidate();
  setActiveEditable(null);
}

function hasRenderableEditableBox(element: EditableElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function setActiveEditable(element: EditableElement | null): void {
  activeEditable = element;
  syncActiveEditableVisibilityObservation();
}

function syncActiveEditableVisibilityObservation(): void {
  visibilityObserver?.disconnect();

  if (!activeEditable) {
    return;
  }

  visibilityObserver ??= new MutationObserver(handleActiveEditableVisibilityMutation);

  for (let current: Element | null = activeEditable; current; current = current.parentElement) {
    visibilityObserver.observe(current, {
      attributes: true,
      attributeFilter: VISIBILITY_ATTRIBUTE_FILTER
    });

    if (current === document.documentElement) {
      break;
    }
  }
}

function handleActiveEditableVisibilityMutation(): void {
  if (!activeEditable) {
    return;
  }

  if (!activeEditable.isConnected || !isEligibleEditableElement(activeEditable) || !hasRenderableEditableBox(activeEditable)) {
    clearActiveEditableState();
  }
}

function suppressPublishedText(element: EditableElement | null): void {
  if (!element || !isEligibleEditableElement(element)) {
    clearPublishedTextSuppression();
    return;
  }

  lastPublishedText = getEditableText(element).trim();
  lastPublishedElement = lastPublishedText ? element : null;
}

function shouldSuppressPublishedText(element: EditableElement, text: string): boolean {
  if (!lastPublishedElement || !lastPublishedText) {
    return false;
  }

  if (!lastPublishedElement.isConnected || element !== lastPublishedElement || text !== lastPublishedText) {
    clearPublishedTextSuppression();
    return false;
  }

  return true;
}

function clearPublishedTextSuppression(): void {
  lastPublishedText = "";
  lastPublishedElement = null;
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
