import { buildTranslationRequest, extractTranslation } from "../src/background/openaiCompatible";
import { DEFAULT_SETTINGS } from "../src/shared/settings";

describe("openai compatible provider", () => {
  it("builds a chat completions request", () => {
    const request = buildTranslationRequest(
      {
        ...DEFAULT_SETTINGS,
        baseUrl: "https://example.test/v1/",
        apiKey: "key",
        model: "model-a"
      },
      "你好",
      "Chinese",
      "English"
    );

    expect(request.url).toBe("https://example.test/v1/chat/completions");
    expect(request.init.method).toBe("POST");
    expect((request.init.headers as Record<string, string>).Authorization).toBe("Bearer key");

    const body = JSON.parse(request.init.body as string);
    expect(body.model).toBe("model-a");
    expect(body.messages[0].content).toContain("Return only a natural translation in English");
    expect(body.messages[1].content).toContain("Translate from Chinese to English");
    expect(body.messages[1].content).toContain("你好");
  });

  it("does not append the endpoint twice", () => {
    const request = buildTranslationRequest(
      {
        ...DEFAULT_SETTINGS,
        baseUrl: "https://example.test/v1/chat/completions"
      },
      "你好",
      "Chinese",
      "English"
    );

    expect(request.url).toBe("https://example.test/v1/chat/completions");
  });

  it("builds the current DeepSeek chat completions endpoint", () => {
    const request = buildTranslationRequest(
      {
        ...DEFAULT_SETTINGS,
        baseUrl: "https://api.deepseek.com",
        apiKey: "key",
        model: "deepseek-v4-flash"
      },
      "你好",
      "Chinese",
      "English"
    );

    expect(request.url).toBe("https://api.deepseek.com/chat/completions");
  });

  it("extracts trimmed translation text", () => {
    expect(
      extractTranslation({
        choices: [{ message: { content: " Hello. \n" } }]
      })
    ).toBe("Hello.");
  });

  it("throws on empty translation responses", () => {
    expect(() => extractTranslation({ choices: [{ message: { content: " " } }] })).toThrow(
      "Translation response did not include text."
    );
  });
});
