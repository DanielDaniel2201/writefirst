export interface TranslateTextMessage {
  type: "TRANSLATE_TEXT";
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export type RuntimeMessage = TranslateTextMessage;

export type TranslateTextResponse =
  | {
      ok: true;
      translation: string;
    }
  | {
      ok: false;
      error: string;
    };
