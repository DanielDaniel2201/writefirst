import type { EditableElement } from "./editable";

const HOST_ID = "write-first-translation-card-host";
const CARD_GAP = 6;
const FLIP_ABOVE_SPACE_THRESHOLD = 120;
const FALLBACK_CARD_HEIGHT = 72;
const MIN_CARD_HEIGHT = 32;
const MAX_CARD_HEIGHT = 220;
const MIN_CARD_WIDTH = 220;
const DEFAULT_CARD_WIDTH = 260;
const MAX_CARD_WIDTH = 520;
const VIEWPORT_PADDING = 12;

type CardTone = "translation" | "error" | "loading";

export class TranslationCard {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private content: HTMLDivElement | null = null;
  private anchor: EditableElement | null = null;
  private rafId = 0;

  show(anchor: EditableElement, translation: string, tone: CardTone = "translation"): void {
    this.ensure();
    this.anchor = anchor;

    if (!this.host || !this.content) {
      return;
    }

    this.content.textContent = translation;
    this.content.className = `card card--${tone}`;
    this.host.hidden = false;
    this.position();
  }

  hide(): void {
    this.anchor = null;

    if (this.host) {
      this.host.hidden = true;
    }
  }

  repositionSoon(): void {
    if (!this.anchor || this.rafId) {
      return;
    }

    this.rafId = window.requestAnimationFrame(() => {
      this.rafId = 0;
      this.position();
    });
  }

  remove(): void {
    this.host?.remove();
    this.host = null;
    this.shadow = null;
    this.content = null;
    this.anchor = null;
  }

  private ensure(): void {
    if (this.host && this.shadow && this.content) {
      return;
    }

    const host = document.getElementById(HOST_ID) as HTMLDivElement | null;
    this.host = host ?? document.createElement("div");
    this.host.id = HOST_ID;
    this.host.hidden = true;
    this.host.style.position = "absolute";
    this.host.style.zIndex = "2147483647";
    this.host.style.pointerEvents = "none";

    if (!host) {
      document.documentElement.append(this.host);
    }

    this.shadow = this.host.shadowRoot ?? this.host.attachShadow({ mode: "open" });
    this.shadow.replaceChildren();

    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
      }

      .card {
        box-sizing: border-box;
        min-height: 32px;
        max-height: 220px;
        overflow: auto;
        padding: 10px 12px;
        border: 1px solid rgba(20, 31, 51, 0.14);
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 8px 24px rgba(20, 31, 51, 0.14);
        color: #141f33;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
        line-height: 1.45;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
      }

      .card--error {
        border-color: rgba(176, 52, 52, 0.28);
        background: #fff7f7;
        color: #7f1d1d;
      }

      .card--loading {
        color: #4b5563;
      }
    `;

    this.content = document.createElement("div");
    this.content.className = "card";
    this.shadow.append(style, this.content);
  }

  private position(): void {
    if (!this.anchor || !this.host || this.host.hidden || !this.anchor.isConnected) {
      this.hide();
      return;
    }

    const rect = this.anchor.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      this.hide();
      return;
    }

    const left = Math.max(VIEWPORT_PADDING, Math.min(rect.left, window.innerWidth - VIEWPORT_PADDING - MIN_CARD_WIDTH));
    const availableWidth = Math.max(MIN_CARD_WIDTH, window.innerWidth - left - VIEWPORT_PADDING);
    const width = Math.min(Math.max(rect.width, DEFAULT_CARD_WIDTH), availableWidth, MAX_CARD_WIDTH);
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const spaceAbove = rect.top - VIEWPORT_PADDING;
    const shouldOpenAbove = spaceBelow < FLIP_ABOVE_SPACE_THRESHOLD && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      MIN_CARD_HEIGHT,
      Math.min(MAX_CARD_HEIGHT, shouldOpenAbove ? spaceAbove - CARD_GAP : spaceBelow - CARD_GAP)
    );
    this.host.style.left = `${left + window.scrollX}px`;
    this.host.style.width = `${width}px`;
    this.host.style.maxHeight = `${maxHeight}px`;

    if (this.content) {
      this.content.style.maxHeight = `${maxHeight}px`;
    }

    const cardHeight = this.measureCardHeight(maxHeight);
    const top = shouldOpenAbove
      ? Math.max(VIEWPORT_PADDING, rect.top - CARD_GAP - cardHeight)
      : Math.min(rect.bottom + CARD_GAP, window.innerHeight - VIEWPORT_PADDING);

    this.host.style.top = `${top + window.scrollY}px`;
  }

  private measureCardHeight(maxHeight: number): number {
    if (!this.content) {
      return Math.min(FALLBACK_CARD_HEIGHT, maxHeight);
    }

    const measuredHeight = this.content.getBoundingClientRect().height || this.content.scrollHeight;
    return Math.min(maxHeight, measuredHeight || FALLBACK_CARD_HEIGHT);
  }
}
