import { TranslationCard } from "../src/content/card";

describe("TranslationCard", () => {
  let cardHeight = 40;

  beforeEach(() => {
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
