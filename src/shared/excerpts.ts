export const EXCERPTS_STORAGE_KEY = "excerpts";

export interface Excerpt {
  text: string;
  createdAt: string;
}

let writeQueue: Promise<void> = Promise.resolve();

export async function getExcerpts(): Promise<Excerpt[]> {
  const value = await chrome.storage.local.get(EXCERPTS_STORAGE_KEY);
  return normalizeExcerpts(value[EXCERPTS_STORAGE_KEY]);
}

export function addExcerpt(text: string, now = new Date()): Promise<void> {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return Promise.resolve();
  }

  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    const excerpts = await getExcerpts();
    excerpts.push({
      text: normalizedText,
      createdAt: now.toISOString()
    });
    await chrome.storage.local.set({ [EXCERPTS_STORAGE_KEY]: excerpts });
  });

  return writeQueue;
}

export function normalizeExcerpts(value: unknown): Excerpt[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isExcerpt).map((excerpt) => ({
    text: excerpt.text,
    createdAt: excerpt.createdAt
  }));
}

function isExcerpt(value: unknown): value is Excerpt {
  if (!value || typeof value !== "object") {
    return false;
  }

  const excerpt = value as Partial<Excerpt>;
  return (
    typeof excerpt.text === "string" &&
    excerpt.text.trim().length > 0 &&
    typeof excerpt.createdAt === "string" &&
    !Number.isNaN(Date.parse(excerpt.createdAt))
  );
}
