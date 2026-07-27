export type EditableElement = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

const SUPPORTED_INPUT_TYPES = new Set(["", "text", "search"]);
const BLOCKED_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "date",
  "datetime-local",
  "email",
  "file",
  "hidden",
  "image",
  "month",
  "number",
  "password",
  "radio",
  "range",
  "reset",
  "submit",
  "tel",
  "time",
  "url",
  "week"
]);

const SENSITIVE_HINTS = [
  "2fa",
  "cardnumber",
  "card-number",
  "cc-number",
  "creditcard",
  "credit-card",
  "cvc",
  "cvv",
  "email",
  "mail",
  "one-time-code",
  "otp",
  "passcode",
  "password",
  "phone",
  "pin",
  "security-code",
  "ssn",
  "telephone",
  "verification-code"
];

export function resolveEditableTarget(target: EventTarget | null): EditableElement | null {
  const element = eventTargetToElement(target);

  if (!element) {
    return null;
  }

  for (let current: Element | null = element; current; current = parentElementOrHost(current)) {
    if (current instanceof HTMLInputElement || current instanceof HTMLTextAreaElement) {
      return current;
    }

    if (current instanceof HTMLElement && isEditableHost(current)) {
      return current;
    }
  }

  return null;
}

export function resolveActiveEditableTarget(doc: Document = document): EditableElement | null {
  return resolveEditableTarget(deepActiveElement(doc));
}

export function resolveSelectionEditableTarget(doc: Document = document): EditableElement | null {
  const selection = doc.getSelection();
  return resolveEditableTarget(selection?.anchorNode ?? selection?.focusNode ?? null);
}

export function isEligibleEditableElement(element: EditableElement | null): element is EditableElement {
  if (!element || !element.isConnected) {
    return false;
  }

  if (element instanceof HTMLInputElement) {
    return isEligibleInput(element);
  }

  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly && isVisible(element) && !hasSensitiveHints(element);
  }

  return isEditableHost(element) && !isAriaDisabledOrReadonly(element) && isVisible(element) && !hasSensitiveHints(element);
}

export function getEditableText(element: EditableElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value;
  }

  return getContentEditableText(element).trim();
}

export function hasMinimumVisibleChars(text: string, minChars: number): boolean {
  return visibleCharCount(text) >= minChars;
}

export function isActiveEditable(element: EditableElement, doc: Document = document): boolean {
  const activeElement = doc.activeElement;

  if (!activeElement) {
    return false;
  }

  return activeElement === element || element.contains(activeElement);
}

function isEligibleInput(input: HTMLInputElement): boolean {
  const type = input.type.toLowerCase();

  if (input.disabled || input.readOnly || !isVisible(input) || BLOCKED_INPUT_TYPES.has(type)) {
    return false;
  }

  if (!SUPPORTED_INPUT_TYPES.has(type)) {
    return false;
  }

  return !hasSensitiveHints(input);
}

function isContentEditableRoot(element: HTMLElement): boolean {
  const value = element.getAttribute("contenteditable")?.toLowerCase();
  return value === "" || value === "true" || value === "plaintext-only";
}

function isAriaTextBox(element: HTMLElement): boolean {
  const role = element.getAttribute("role")?.toLowerCase();
  return role === "textbox" || role === "searchbox";
}

function isEditableHost(element: HTMLElement): boolean {
  return isContentEditableRoot(element) || isAriaTextBox(element);
}

function isAriaDisabledOrReadonly(element: HTMLElement): boolean {
  return element.getAttribute("aria-disabled") === "true" || element.getAttribute("aria-readonly") === "true";
}

function getContentEditableText(element: HTMLElement): string {
  const text = readElementText(element);
  const rootPlaceholders = getPlaceholderValues(element);

  if (rootPlaceholders.some((placeholder) => text.trim() === placeholder)) {
    return "";
  }

  const clone = element.cloneNode(true) as HTMLElement;
  const placeholderNodes = Array.from(
    clone.querySelectorAll<HTMLElement>("[aria-placeholder], [data-placeholder], [placeholder]")
  );

  for (const node of placeholderNodes) {
    const nodeText = readElementText(node).trim();
    const placeholderValues = [...getPlaceholderValues(node), ...rootPlaceholders];

    if (
      nodeText &&
      (placeholderValues.includes(nodeText) ||
        (node.hasAttribute("data-placeholder") && !node.getAttribute("data-placeholder")?.trim()))
    ) {
      node.remove();
    }
  }

  return readElementText(clone);
}

function getPlaceholderValues(element: HTMLElement): string[] {
  return [
    element.getAttribute("aria-placeholder"),
    element.getAttribute("data-placeholder"),
    element.getAttribute("placeholder")
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function readElementText(element: HTMLElement): string {
  return element.innerText || element.textContent || "";
}

function hasSensitiveHints(element: HTMLElement): boolean {
  const hintText = [
    element.getAttribute("autocomplete"),
    element.getAttribute("inputmode"),
    element.getAttribute("name"),
    element.getAttribute("id"),
    element.getAttribute("aria-label"),
    element.getAttribute("placeholder"),
    element.getAttribute("title"),
    element.className
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, "-");

  return SENSITIVE_HINTS.some((hint) => hintText.includes(hint));
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);

  if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") {
    return false;
  }

  if (element.getAttribute("aria-hidden") === "true" || element.hidden) {
    return false;
  }

  return true;
}

function visibleCharCount(text: string): number {
  return Array.from(text.replace(/\s+/g, "")).length;
}

function eventTargetToElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) {
    return target;
  }

  return target instanceof Text ? target.parentElement : null;
}

function parentElementOrHost(element: Element): Element | null {
  if (element.parentElement) {
    return element.parentElement;
  }

  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

function deepActiveElement(doc: Document): Element | null {
  let activeElement: Element | null = doc.activeElement;

  while (activeElement?.shadowRoot?.activeElement) {
    activeElement = activeElement.shadowRoot.activeElement;
  }

  return activeElement;
}
