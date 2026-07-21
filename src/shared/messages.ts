export interface TranslateTextMessage {
  type: "TRANSLATE_TEXT";
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface RecordExcerptMessage {
  type: "RECORD_EXCERPT";
  text: string;
}

export type RuntimeMessage = TranslateTextMessage | RecordExcerptMessage;

export type TranslateTextResponse =
  | {
      ok: true;
      translation: string;
    }
  | {
      ok: false;
      error: string;
    };

export type RecordExcerptResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export type RuntimeResponse = TranslateTextResponse | RecordExcerptResponse;
