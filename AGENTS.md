# AGENTS.md

This file is for coding agents working on Write First. Treat it as the project brief plus local engineering instructions.

## Project Overview

Write First is a Chrome Manifest V3 extension for language learning while writing. The MVP watches normal web text inputs and, after the user pauses, displays a read-only translation card below the active input.

The extension must not replace user text, submit anything, steal focus, intercept Enter, or otherwise change the page's normal input behavior. The translation card is only a view.

## Development Commands

- Install dependencies: `npm install`
- Type check: `npm run typecheck`
- Run tests: `npm run test`
- Build unpacked extension: `npm run build`
- Full verification: `npm run verify`

The Chrome unpacked extension output is `dist/`.

## Architecture

- `src/manifest.json`: Chrome MV3 manifest.
- `src/content.ts`: page-side input tracking, debounce, request invalidation, and card lifecycle.
- `src/content/editable.ts`: eligibility rules for supported inputs and sensitive-field exclusions.
- `src/content/card.ts`: passive translation card rendering and positioning.
- `src/background.ts`: runtime message handler for translation requests.
- `src/background/openaiCompatible.ts`: OpenAI-compatible chat completions provider.
- `src/popup.*`: settings UI for languages, provider config, API key, model, and enabled state.
- `src/shared/*`: shared settings and message types.
- `tests/*`: unit tests for core rules and provider request construction.

## Core Behavior Requirements

- Support ordinary `input[type=text]`, `input[type=search]`, `textarea`, and common `contenteditable` fields.
- Skip sensitive or inappropriate fields, including password, email, telephone, URL, number, OTP, payment-like, hidden, disabled, and readonly fields.
- Wait `800ms` after typing stops before requesting translation.
- Translate the full current field value when it has at least 2 visible non-whitespace characters.
- Hide the old card as soon as the user continues typing.
- Ignore stale translation responses if the input changed, the active element changed, the field lost focus, or a newer request exists.
- Card visibility is state-bound, not timer-bound: keep it while the same field remains focused and unchanged; hide on continued input, clear, blur, disable, extension off, or element removal.
- The card must remain passive: no focus, no keyboard handling, no click-dependent behavior, and `pointer-events: none` unless a future feature intentionally changes that.

## Privacy and Data Rules

- Do not store user input history or translation history.
- Store only settings in `chrome.storage.sync`.
- Send text only to the user-configured OpenAI-compatible API endpoint.
- Do not add analytics, telemetry, logging of user text, or remote debugging without explicit product approval.
- Avoid broadening permissions beyond the MVP needs unless the change is justified.

## Provider Rules

- MVP provider shape is OpenAI-compatible chat completions.
- Keep provider code isolated so a future paid backend proxy can be added without rewriting content-script behavior.
- Prompt output should be only the natural target-language translation: no explanations, no alternatives, no notes, no quotation marks.
- If the base URL already ends in `/chat/completions`, use it as-is; otherwise append `/chat/completions`.

## UI Rules

- Popup should stay compact and practical: enabled switch, source language, target language, base URL, model, API key.
- The in-page card should feel like a quiet annotation, not a replacement editor or assistant panel.
- Avoid UI that looks like it can submit, rewrite, accept, or insert the translation unless that feature is deliberately being added.
- Do not add learning history, copy buttons, close buttons, or account features unless requested; those are outside the current MVP.

## Testing Expectations

When changing core behavior, update or add tests for:

- Input eligibility and sensitive-field exclusion.
- Text extraction and minimum visible character handling.
- Request construction for the OpenAI-compatible provider.
- Card show/hide and positioning behavior.
- Stale response rejection and debounce behavior where practical.

Before handing off changes, run `npm run verify` when dependencies are available.

## Product Description

Write First 的核心理念是：一个人真正想学会用外语表达的内容，往往就是他日常已经在表达的内容。

外语学习的潜在目标，不一定是考到某个等级、通过某个考试，或达到某个抽象的 CEFR 标准。更实际的目标是：我现在想说的话、想写的话、想搜索的问题、想发出的评论、想记录的想法，未来都能逐渐用目标语言表达出来。

因此，Write First 把用户自己的输入当成最有兴趣、最相关、最有记忆点的学习语料。用户不是先去读一批别人预设好的句子，而是在自己已经产生表达欲的时刻，看见这句话在目标语言里可以怎么自然地说。

它不是沉浸式翻译插件，也不是自动代写或自动改写工具。它不会把网页内容整体翻译成另一种语言，也不会把输入框里的母语文字直接替换成外语。用户仍然在原本的网站、原本的输入框、原本的语境里完成自己的表达。

Write First 更像一个安静的旁注：用户先写下自己真正想表达的东西，插件再把对应的外语表达展示在旁边，让用户可以看见、比较、记住，并逐渐内化。

后续细节可以调整，例如支持哪些网站、哪些输入组件、翻译服务如何配置、是否加入学习记录、是否支持付费后端等。但产品中心不变：Write First 不是替用户表达，而是在用户真实表达的现场，把“我刚刚想说的话，目标语言可以怎么说”呈现出来。
