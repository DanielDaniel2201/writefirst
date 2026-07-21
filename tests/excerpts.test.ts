import { EXCERPTS_STORAGE_KEY, addExcerpt, getExcerpts, normalizeExcerpts } from "../src/shared/excerpts";

describe("excerpts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("keeps only valid original-text records", () => {
    expect(
      normalizeExcerpts([
        { text: "我想学会表达", createdAt: "2026-07-21T02:03:04.000Z" },
        { text: "", createdAt: "2026-07-21T02:03:04.000Z" },
        { text: "缺少有效时间", createdAt: "not-a-date" },
        { translation: "This should not be stored" }
      ])
    ).toEqual([{ text: "我想学会表达", createdAt: "2026-07-21T02:03:04.000Z" }]);
  });

  it("appends each translation trigger with its timestamp", async () => {
    const stored = {
      [EXCERPTS_STORAGE_KEY]: [{ text: "第一条", createdAt: "2026-07-21T01:00:00.000Z" }]
    };
    const get = vi.fn().mockImplementation(async () => stored);
    const set = vi.fn().mockImplementation(async (next: typeof stored) => {
      stored[EXCERPTS_STORAGE_KEY] = next[EXCERPTS_STORAGE_KEY];
    });

    vi.stubGlobal("chrome", {
      storage: {
        local: { get, set }
      }
    });

    await addExcerpt("  第二条原文  ", new Date("2026-07-21T02:03:04.000Z"));

    expect(await getExcerpts()).toEqual([
      { text: "第一条", createdAt: "2026-07-21T01:00:00.000Z" },
      { text: "第二条原文", createdAt: "2026-07-21T02:03:04.000Z" }
    ]);
    expect(set).toHaveBeenCalledWith({
      [EXCERPTS_STORAGE_KEY]: [
        { text: "第一条", createdAt: "2026-07-21T01:00:00.000Z" },
        { text: "第二条原文", createdAt: "2026-07-21T02:03:04.000Z" }
      ]
    });
  });
});
