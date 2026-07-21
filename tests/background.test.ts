import { DEFAULT_SETTINGS } from "../src/shared/settings";

describe("background worker", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens the full-page options workspace when the extension icon is clicked", async () => {
    let actionClick: (() => void) | undefined;
    const openOptionsPage = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal("chrome", createChromeMock({
      onActionClick: (listener) => {
        actionClick = listener;
      },
      openOptionsPage
    }));

    await import("../src/background");
    actionClick?.();

    expect(openOptionsPage).toHaveBeenCalledOnce();
  });

  it("stores the original text only after the content script confirms a completed translation", async () => {
    let messageListener:
      | ((message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean)
      | undefined;
    const localValue: Record<string, unknown> = {};
    const localSet = vi.fn().mockImplementation(async (next: Record<string, unknown>) => {
      Object.assign(localValue, next);
    });

    vi.stubGlobal("chrome", createChromeMock({
      onMessage: (listener) => {
        messageListener = listener;
      },
      localGet: vi.fn().mockImplementation(async () => localValue),
      localSet
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ choices: [{ message: { content: "Hello" } }] })
      })
    );

    await import("../src/background");

    const sendResponse = vi.fn();
    const keepsChannelOpen = messageListener?.(
      {
        type: "TRANSLATE_TEXT",
        text: "  你好  ",
        sourceLanguage: "Chinese",
        targetLanguage: "English"
      },
      {},
      sendResponse
    );

    expect(keepsChannelOpen).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ ok: true, translation: "Hello" }));
    expect(localSet).not.toHaveBeenCalled();

    const recordResponse = vi.fn();
    const keepsRecordChannelOpen = messageListener?.(
      {
        type: "RECORD_EXCERPT",
        text: "  你好  "
      },
      {},
      recordResponse
    );

    expect(keepsRecordChannelOpen).toBe(true);
    await vi.waitFor(() => expect(recordResponse).toHaveBeenCalledWith({ ok: true }));

    expect(localSet).toHaveBeenCalledOnce();
    const stored = localSet.mock.calls[0][0] as {
      excerpts: Array<Record<string, unknown>>;
    };
    expect(stored.excerpts).toHaveLength(1);
    expect(stored.excerpts[0]).toEqual({
      text: "你好",
      createdAt: expect.any(String)
    });
    expect(Object.keys(stored.excerpts[0])).toEqual(["text", "createdAt"]);
    expect(Number.isNaN(Date.parse(stored.excerpts[0].createdAt as string))).toBe(false);
  });
});

function createChromeMock(options: {
  onActionClick?: (listener: () => void) => void;
  onMessage?: (
    listener: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean
  ) => void;
  openOptionsPage?: ReturnType<typeof vi.fn>;
  localGet?: ReturnType<typeof vi.fn>;
  localSet?: ReturnType<typeof vi.fn>;
}) {
  return {
    action: {
      onClicked: {
        addListener: options.onActionClick ?? vi.fn()
      }
    },
    runtime: {
      onMessage: {
        addListener: options.onMessage ?? vi.fn()
      },
      openOptionsPage: options.openOptionsPage ?? vi.fn().mockResolvedValue(undefined)
    },
    storage: {
      sync: {
        get: vi.fn().mockResolvedValue({ ...DEFAULT_SETTINGS, apiKey: "test-key" }),
        set: vi.fn()
      },
      local: {
        get: options.localGet ?? vi.fn().mockResolvedValue({}),
        set: options.localSet ?? vi.fn().mockResolvedValue(undefined),
        setAccessLevel: vi.fn().mockResolvedValue(undefined)
      }
    }
  };
}
