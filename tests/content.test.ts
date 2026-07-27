import { DEFAULT_SETTINGS } from "../src/shared/settings";

describe("content script", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-write-first-content-loaded");
  });

  afterEach(async () => {
    document.body.innerHTML = "";
    await Promise.resolve();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("translates a Google-style textarea even when the page temporarily moves focus", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ ok: true, translation: "Hello" });
    vi.stubGlobal("chrome", {
      runtime: { sendMessage },
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
          set: vi.fn()
        },
        onChanged: { addListener: vi.fn() }
      }
    });

    await import("../src/content");
    await Promise.resolve();
    await Promise.resolve();

    document.body.tabIndex = -1;
    document.body.innerHTML = `
      <textarea
        id="search"
        class="gLFyf"
        name="q"
        aria-label="Search"
        autocomplete="off"
      ></textarea>
    `;

    const search = document.getElementById("search") as HTMLTextAreaElement;
    search.getBoundingClientRect = () =>
      ({
        bottom: 80,
        height: 44,
        left: 20,
        right: 520,
        top: 36,
        width: 500,
        x: 20,
        y: 36,
        toJSON: () => ({})
      }) as DOMRect;

    search.focus();
    search.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    search.value = "你好";
    search.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "好" }));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    search.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: document.body }));
    document.body.focus();

    await vi.advanceTimersByTimeAsync(800);

    expect(sendMessage).toHaveBeenCalledWith({
      type: "TRANSLATE_TEXT",
      text: "你好",
      sourceLanguage: "Chinese",
      targetLanguage: "English"
    });

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    expect(host.hidden).toBe(false);
    expect(host.shadowRoot?.textContent).toContain("Hello");
    expect(sendMessage).toHaveBeenCalledWith({
      type: "RECORD_EXCERPT",
      text: "你好"
    });
  });

  it("uses the current selection to translate rich ARIA textbox editors", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ ok: true, translation: "Hello" });
    vi.stubGlobal("chrome", {
      runtime: { sendMessage },
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
          set: vi.fn()
        },
        onChanged: { addListener: vi.fn() }
      }
    });

    await import("../src/content");
    await Promise.resolve();
    await Promise.resolve();

    document.body.innerHTML = `
      <div id="composer" role="textbox" aria-label="Post text">
        <span id="child">你好</span>
      </div>
    `;

    const composer = document.getElementById("composer") as HTMLElement;
    composer.getBoundingClientRect = () =>
      ({
        bottom: 120,
        height: 44,
        left: 20,
        right: 520,
        top: 76,
        width: 500,
        x: 20,
        y: 76,
        toJSON: () => ({})
      }) as DOMRect;

    const childText = document.getElementById("child")?.firstChild as Text;
    const range = document.createRange();
    range.setStart(childText, 2);
    range.collapse(true);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));

    await vi.advanceTimersByTimeAsync(800);

    expect(sendMessage).toHaveBeenCalledWith({
      type: "TRANSLATE_TEXT",
      text: "你好",
      sourceLanguage: "Chinese",
      targetLanguage: "English"
    });
  });

  it("does not translate nested placeholder text in rich editors", async () => {
    const sendMessage = vi.fn();
    vi.stubGlobal("chrome", {
      runtime: { sendMessage },
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
          set: vi.fn()
        },
        onChanged: { addListener: vi.fn() }
      }
    });

    await import("../src/content");
    await Promise.resolve();
    await Promise.resolve();

    document.body.innerHTML = `
      <div id="composer" role="textbox" aria-placeholder="What is happening?">
        <span data-placeholder="What is happening?">What is happening?</span>
      </div>
    `;

    const childText = document.querySelector("[data-placeholder]")?.firstChild as Text;
    const range = document.createRange();
    range.setStart(childText, childText.length);
    range.collapse(true);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));

    await vi.advanceTimersByTimeAsync(800);

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("does not record a translation response invalidated by continued typing", async () => {
    let resolveTranslation: (value: { ok: true; translation: string }) => void = () => {};
    const translationResponse = new Promise<{ ok: true; translation: string }>((resolve) => {
      resolveTranslation = resolve;
    });
    const sendMessage = vi.fn().mockImplementation((message: { type: string }) => {
      if (message.type === "TRANSLATE_TEXT") {
        return translationResponse;
      }

      return Promise.resolve({ ok: true });
    });

    vi.stubGlobal("chrome", {
      runtime: { sendMessage },
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
          set: vi.fn()
        },
        onChanged: { addListener: vi.fn() }
      }
    });

    await import("../src/content");
    await Promise.resolve();
    await Promise.resolve();

    document.body.innerHTML = '<textarea id="composer"></textarea>';
    const composer = document.getElementById("composer") as HTMLTextAreaElement;
    composer.getBoundingClientRect = () =>
      ({
        bottom: 80,
        height: 44,
        left: 20,
        right: 520,
        top: 36,
        width: 500,
        x: 20,
        y: 36,
        toJSON: () => ({})
      }) as DOMRect;

    composer.focus();
    composer.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    composer.value = "你好";
    composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "好" }));
    await vi.advanceTimersByTimeAsync(800);

    composer.value = "你好呀";
    composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "呀" }));
    resolveTranslation({ ok: true, translation: "Hello" });
    await Promise.resolve();
    await Promise.resolve();

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    expect(host.hidden).toBe(true);
    expect(
      sendMessage.mock.calls.some(
        ([message]) => message.type === "RECORD_EXCERPT" && message.text === "你好"
      )
    ).toBe(false);
  });

  it("hides a loading card when a rich editor is cleared before translation returns", async () => {
    let resolveResponse: (value: { ok: true; translation: string }) => void = () => {};
    const sendMessage = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveResponse = resolve;
      })
    );
    vi.stubGlobal("chrome", {
      runtime: { sendMessage },
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
          set: vi.fn()
        },
        onChanged: { addListener: vi.fn() }
      }
    });

    await import("../src/content");
    await Promise.resolve();
    await Promise.resolve();

    document.body.innerHTML = `
      <div id="composer" role="textbox" aria-label="Post text">
        <span id="child">hello</span>
      </div>
    `;

    const composer = document.getElementById("composer") as HTMLElement;
    composer.getBoundingClientRect = () =>
      ({
        bottom: 120,
        height: 44,
        left: 20,
        right: 520,
        top: 76,
        width: 500,
        x: 20,
        y: 76,
        toJSON: () => ({})
      }) as DOMRect;

    const childText = document.getElementById("child")?.firstChild as Text;
    const range = document.createRange();
    range.setStart(childText, 5);
    range.collapse(true);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));

    await vi.advanceTimersByTimeAsync(800);

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    expect(host.hidden).toBe(false);
    expect(host.shadowRoot?.textContent).toContain("Translating...");

    composer.textContent = "";
    await Promise.resolve();

    expect(host.hidden).toBe(true);

    resolveResponse({ ok: true, translation: "Hello" });
    await Promise.resolve();

    expect(host.hidden).toBe(true);
    expect(sendMessage.mock.calls.some(([message]) => message.type === "RECORD_EXCERPT")).toBe(false);
  });

  it("does not retranslate unchanged text when only the selection changes", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ ok: true, translation: "Hello" });
    vi.stubGlobal("chrome", {
      runtime: { sendMessage },
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
          set: vi.fn()
        },
        onChanged: { addListener: vi.fn() }
      }
    });

    await import("../src/content");
    await Promise.resolve();
    await Promise.resolve();

    document.body.innerHTML = `
      <div id="composer" role="textbox" aria-label="Post text">
        <span id="child">hello</span>
      </div>
    `;

    const composer = document.getElementById("composer") as HTMLElement;
    composer.getBoundingClientRect = () =>
      ({
        bottom: 120,
        height: 44,
        left: 20,
        right: 520,
        top: 76,
        width: 500,
        x: 20,
        y: 76,
        toJSON: () => ({})
      }) as DOMRect;

    const childText = document.getElementById("child")?.firstChild as Text;
    const range = document.createRange();
    range.setStart(childText, 5);
    range.collapse(true);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));

    await vi.advanceTimersByTimeAsync(800);
    await Promise.resolve();

    expect(countMessages(sendMessage, "TRANSLATE_TEXT")).toBe(1);

    range.setStart(childText, 0);
    range.setEnd(childText, 5);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    composer.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "a", ctrlKey: true }));

    await vi.advanceTimersByTimeAsync(1600);

    expect(countMessages(sendMessage, "TRANSLATE_TEXT")).toBe(1);
  });

  it("hides the card when a Twitter post button inside the composer is clicked", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ ok: true, translation: "Hello" });
    vi.stubGlobal("chrome", {
      runtime: { sendMessage },
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
          set: vi.fn()
        },
        onChanged: { addListener: vi.fn() }
      }
    });

    await import("../src/content");
    await Promise.resolve();
    await Promise.resolve();

    document.body.innerHTML = `
      <div id="composer" role="textbox" aria-label="Post text">
        <span id="child">hello</span>
        <button data-testid="tweetButtonInline"></button>
      </div>
    `;

    const composer = document.getElementById("composer") as HTMLElement;
    composer.getBoundingClientRect = () =>
      ({
        bottom: 120,
        height: 44,
        left: 20,
        right: 520,
        top: 76,
        width: 500,
        x: 20,
        y: 76,
        toJSON: () => ({})
      }) as DOMRect;

    const childText = document.getElementById("child")?.firstChild as Text;
    const range = document.createRange();
    range.setStart(childText, 5);
    range.collapse(true);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));

    await vi.advanceTimersByTimeAsync(800);
    await Promise.resolve();

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    expect(host.hidden).toBe(false);

    const button = document.querySelector("[data-testid='tweetButtonInline']") as HTMLButtonElement;
    button.dispatchEvent(new Event("click", { bubbles: true }));

    expect(host.hidden).toBe(true);
  });

  it("keeps the card visible when the user clicks the translation card itself", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ ok: true, translation: "Hello" });
    vi.stubGlobal("chrome", {
      runtime: { sendMessage },
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
          set: vi.fn()
        },
        onChanged: { addListener: vi.fn() }
      }
    });

    await import("../src/content");
    await Promise.resolve();
    await Promise.resolve();

    document.body.innerHTML = `
      <div id="composer" role="textbox" aria-label="Post text">
        <span id="child">hello</span>
      </div>
    `;

    const composer = document.getElementById("composer") as HTMLElement;
    composer.getBoundingClientRect = () =>
      ({
        bottom: 120,
        height: 44,
        left: 20,
        right: 520,
        top: 76,
        width: 500,
        x: 20,
        y: 76,
        toJSON: () => ({})
      }) as DOMRect;

    const childText = document.getElementById("child")?.firstChild as Text;
    const range = document.createRange();
    range.setStart(childText, 5);
    range.collapse(true);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));

    await vi.advanceTimersByTimeAsync(800);
    await Promise.resolve();

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    expect(host.hidden).toBe(false);

    host.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, composed: true }));
    host.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
    host.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    expect(host.hidden).toBe(false);
  });

  it("does not retranslate the same composer text after a publish click triggers selection updates", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ ok: true, translation: "Hello" });
    vi.stubGlobal("chrome", {
      runtime: { sendMessage },
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
          set: vi.fn()
        },
        onChanged: { addListener: vi.fn() }
      }
    });

    await import("../src/content");
    await Promise.resolve();
    await Promise.resolve();

    document.body.innerHTML = `
      <div id="composer" role="textbox" aria-label="Post text">
        <span id="child">hello</span>
      </div>
      <button data-testid="tweetButtonInline">Post</button>
    `;

    const composer = document.getElementById("composer") as HTMLElement;
    composer.getBoundingClientRect = () =>
      ({
        bottom: 120,
        height: 44,
        left: 20,
        right: 520,
        top: 76,
        width: 500,
        x: 20,
        y: 76,
        toJSON: () => ({})
      }) as DOMRect;

    const childText = document.getElementById("child")?.firstChild as Text;
    const range = document.createRange();
    range.setStart(childText, 5);
    range.collapse(true);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));

    await vi.advanceTimersByTimeAsync(800);
    await Promise.resolve();

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    expect(host.hidden).toBe(false);
    expect(countMessages(sendMessage, "TRANSLATE_TEXT")).toBe(1);

    const button = document.querySelector("[data-testid='tweetButtonInline']") as HTMLButtonElement;
    button.dispatchEvent(new Event("click", { bubbles: true }));

    expect(host.hidden).toBe(true);

    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));

    await vi.advanceTimersByTimeAsync(800);
    await Promise.resolve();

    expect(countMessages(sendMessage, "TRANSLATE_TEXT")).toBe(1);
    expect(host.hidden).toBe(true);
  });

  it("hides the card when the composer becomes hidden without being removed", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ ok: true, translation: "Hello" });
    vi.stubGlobal("chrome", {
      runtime: { sendMessage },
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
          set: vi.fn()
        },
        onChanged: { addListener: vi.fn() }
      }
    });

    await import("../src/content");
    await Promise.resolve();
    await Promise.resolve();

    document.body.innerHTML = `
      <div id="composer" role="textbox" aria-label="Post text">
        <span id="child">hello</span>
      </div>
    `;

    const composer = document.getElementById("composer") as HTMLElement;
    let isHidden = false;
    composer.getBoundingClientRect = () =>
      ({
        bottom: isHidden ? 0 : 120,
        height: isHidden ? 0 : 44,
        left: 20,
        right: isHidden ? 20 : 520,
        top: isHidden ? 0 : 76,
        width: isHidden ? 0 : 500,
        x: 20,
        y: isHidden ? 0 : 76,
        toJSON: () => ({})
      }) as DOMRect;

    const childText = document.getElementById("child")?.firstChild as Text;
    const range = document.createRange();
    range.setStart(childText, 5);
    range.collapse(true);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));

    await vi.advanceTimersByTimeAsync(800);
    await Promise.resolve();

    const host = document.getElementById("write-first-translation-card-host") as HTMLDivElement;
    expect(host.hidden).toBe(false);

    isHidden = true;
    composer.setAttribute("hidden", "");
    await Promise.resolve();

    expect(host.hidden).toBe(true);
  });
});

function countMessages(sendMessage: ReturnType<typeof vi.fn>, type: string): number {
  return sendMessage.mock.calls.filter(([message]) => message.type === type).length;
}
