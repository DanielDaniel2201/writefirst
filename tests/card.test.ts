import { TranslationCard } from "../src/content/card";

describe("TranslationCard", () => {
  let cardHeight = 40;

  beforeEach(() => {
    vi.useFakeTimers();
    cardHeight = 40;
    document.body.innerHTML = "";
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    Object.defineProperty(window, "scrollX", { configurable: true, value: 0 });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const height = this.classList.contains("card") ? cardHeight : 0;

      return {
        bottom: height,
        height,
        left: 0,
        right: 0,
        top: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({})
      } as DOMRect;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens below the input when there is useful space below", () => {
    const card = new TranslationCard();
    const input = createAnchor({ top: 200, bottom: 244, left: 120, width: 400, height: 44 });

    card.show(input, "Hello");

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    expect(host.style.top).toBe("250px");
  });

  it("opens above the input when the input sits near the viewport bottom", () => {
    const card = new TranslationCard();
    const input = createAnchor({ top: 720, bottom: 764, left: 120, width: 400, height: 44 });

    card.show(input, "Hello");

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    expect(host.style.top).toBe("674px");
    expect(Number.parseInt(host.style.top, 10)).toBeLessThan(720);
  });

  it("caps very long cards without forcing short cards to fill extra height", () => {
    cardHeight = 1000;
    const card = new TranslationCard();
    const input = createAnchor({ top: 200, bottom: 244, left: 120, width: 400, height: 44 });

    card.show(input, "A long translation");

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    const shadowCard = host.shadowRoot?.querySelector(".card") as HTMLDivElement;
    expect(host.style.maxHeight).toBe("220px");
    expect(shadowCard.style.maxHeight).toBe("220px");
  });

  it("shrinks the card width to fit a short translation", () => {
    const card = new TranslationCard();
    const input = createAnchor({ top: 200, bottom: 244, left: 120, width: 400, height: 44 });

    card.show(input, "Hi");

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    expect(Number.parseInt(host.style.width, 10)).toBeGreaterThan(30);
    expect(Number.parseInt(host.style.width, 10)).toBeLessThan(100);
  });

  it("shrinks the loading card width to fit its placeholder text", () => {
    const card = new TranslationCard();
    const input = createAnchor({ top: 200, bottom: 244, left: 120, width: 400, height: 44 });

    card.show(input, "Translating...", "loading");

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    expect(Number.parseInt(host.style.width, 10)).toBeGreaterThan(80);
    expect(Number.parseInt(host.style.width, 10)).toBeLessThan(160);
  });

  it("auto hides short translations after a brief delay", () => {
    const card = new TranslationCard();
    const input = createAnchor({ top: 200, bottom: 244, left: 120, width: 400, height: 44 });

    card.show(input, "Short text");

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    expect(host.hidden).toBe(false);

    vi.advanceTimersByTime(1499);
    expect(host.hidden).toBe(false);

    vi.advanceTimersByTime(181);
    expect(host.hidden).toBe(true);
  });

  it("does not revive when hovered during the fade-out after auto hide", () => {
    const card = new TranslationCard();
    const input = createAnchor({ top: 200, bottom: 244, left: 120, width: 400, height: 44 });

    card.show(input, "Short text");

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    const shadowCard = host.shadowRoot?.querySelector(".card") as HTMLDivElement;

    vi.advanceTimersByTime(1500);
    expect(host.hidden).toBe(false);
    expect(host.style.pointerEvents).toBe("none");
    expect(shadowCard.classList.contains("card--visible")).toBe(false);

    shadowCard.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(shadowCard.classList.contains("card--visible")).toBe(false);

    vi.advanceTimersByTime(180);
    expect(host.hidden).toBe(true);
  });

  it("ignores hover after the card has fully hidden", () => {
    const card = new TranslationCard();
    const input = createAnchor({ top: 200, bottom: 244, left: 120, width: 400, height: 44 });

    card.show(input, "Short text");

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    const shadowCard = host.shadowRoot?.querySelector(".card") as HTMLDivElement;

    vi.advanceTimersByTime(1680);
    expect(host.hidden).toBe(true);

    shadowCard.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(host.hidden).toBe(true);
    expect(shadowCard.classList.contains("card--visible")).toBe(false);
  });

  it("keeps the card visible while hovered and restarts the timer on mouse leave", () => {
    const card = new TranslationCard();
    const input = createAnchor({ top: 200, bottom: 244, left: 120, width: 400, height: 44 });
    const longTranslation =
      "This translation is deliberately long enough to keep the card visible for a longer delay.";

    card.show(input, longTranslation);

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    const shadowCard = host.shadowRoot?.querySelector(".card") as HTMLDivElement;

    vi.advanceTimersByTime(4000);
    shadowCard.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    vi.advanceTimersByTime(5000);
    expect(host.hidden).toBe(false);

    shadowCard.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    vi.advanceTimersByTime(4499);
    expect(host.hidden).toBe(false);

    vi.advanceTimersByTime(181);
    expect(host.hidden).toBe(true);
  });

  it("uses actual hover state as a fallback when mouseenter does not fire", () => {
    const card = new TranslationCard();
    const input = createAnchor({ top: 200, bottom: 244, left: 120, width: 400, height: 44 });

    card.show(input, "Short text");

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    const shadowCard = host.shadowRoot?.querySelector(".card") as HTMLDivElement;
    let hovered = true;
    const originalHostMatches = host.matches.bind(host);
    const originalCardMatches = shadowCard.matches.bind(shadowCard);

    vi.spyOn(host, "matches").mockImplementation((selector: string) =>
      selector === ":hover" ? hovered : originalHostMatches(selector)
    );
    vi.spyOn(shadowCard, "matches").mockImplementation((selector: string) =>
      selector === ":hover" ? hovered : originalCardMatches(selector)
    );

    vi.advanceTimersByTime(1500);
    expect(host.hidden).toBe(false);

    hovered = false;
    vi.advanceTimersByTime(120);
    expect(host.hidden).toBe(false);

    vi.advanceTimersByTime(1680);
    expect(host.hidden).toBe(true);
  });
});

function createAnchor(rect: Pick<DOMRect, "top" | "bottom" | "left" | "width" | "height">): HTMLTextAreaElement {
  const input = document.createElement("textarea");
  input.getBoundingClientRect = () =>
    ({
      ...rect,
      right: rect.left + rect.width,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({})
    }) as DOMRect;
  document.body.append(input);
  return input;
}
