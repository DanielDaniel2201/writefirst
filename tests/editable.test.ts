import {
  getEditableText,
  hasMinimumVisibleChars,
  isEligibleEditableElement,
  resolveEditableTarget
} from "../src/content/editable";

describe("editable rules", () => {
  it("allows text, search, textarea, and contenteditable fields", () => {
    document.body.innerHTML = `
      <input id="text" type="text" />
      <input id="search" type="search" />
      <textarea id="textarea"></textarea>
      <div id="editable" contenteditable="true"></div>
    `;

    expect(isEligibleEditableElement(document.getElementById("text") as HTMLInputElement)).toBe(true);
    expect(isEligibleEditableElement(document.getElementById("search") as HTMLInputElement)).toBe(true);
    expect(isEligibleEditableElement(document.getElementById("textarea") as HTMLTextAreaElement)).toBe(true);
    expect(isEligibleEditableElement(document.getElementById("editable") as HTMLElement)).toBe(true);
  });

  it("allows the Google search box textarea shape", () => {
    document.body.innerHTML = `
      <textarea
        id="search"
        class="gLFyf"
        name="q"
        aria-label="Search"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      ></textarea>
    `;

    const search = document.getElementById("search") as HTMLTextAreaElement;
    search.value = "你好";

    expect(isEligibleEditableElement(search)).toBe(true);
    expect(getEditableText(search)).toBe("你好");
  });

  it("blocks sensitive or non-text fields", () => {
    document.body.innerHTML = `
      <input id="password" type="password" />
      <input id="email" type="email" />
      <input id="phone" type="text" name="phone" />
      <input id="otp" type="text" autocomplete="one-time-code" />
      <input id="readonly" type="text" readonly />
    `;

    expect(isEligibleEditableElement(document.getElementById("password") as HTMLInputElement)).toBe(false);
    expect(isEligibleEditableElement(document.getElementById("email") as HTMLInputElement)).toBe(false);
    expect(isEligibleEditableElement(document.getElementById("phone") as HTMLInputElement)).toBe(false);
    expect(isEligibleEditableElement(document.getElementById("otp") as HTMLInputElement)).toBe(false);
    expect(isEligibleEditableElement(document.getElementById("readonly") as HTMLInputElement)).toBe(false);
  });

  it("resolves nested contenteditable targets", () => {
    document.body.innerHTML = `
      <div id="editable" contenteditable="true"><span id="child">hello</span></div>
    `;

    const editable = document.getElementById("editable");
    const child = document.getElementById("child");

    expect(resolveEditableTarget(child)).toBe(editable);
  });

  it("supports contenteditable with an empty attribute", () => {
    document.body.innerHTML = `<div id="editable" contenteditable>hello</div>`;

    const editable = document.getElementById("editable") as HTMLElement;

    expect(resolveEditableTarget(editable)).toBe(editable);
    expect(isEligibleEditableElement(editable)).toBe(true);
  });

  it("supports ARIA textbox editors used by rich compose surfaces", () => {
    document.body.innerHTML = `
      <div id="composer" role="textbox" aria-label="Post text">
        <span id="child">hello</span>
      </div>
    `;

    const composer = document.getElementById("composer") as HTMLElement;
    const child = document.getElementById("child") as HTMLElement;

    expect(resolveEditableTarget(child)).toBe(composer);
    expect(isEligibleEditableElement(composer)).toBe(true);
    expect(getEditableText(composer)).toBe("hello");
  });

  it("resolves text nodes inside ARIA textbox editors", () => {
    document.body.innerHTML = `<div id="composer" role="textbox"><span id="child">hello</span></div>`;

    const composer = document.getElementById("composer") as HTMLElement;
    const childText = document.getElementById("child")?.firstChild as Text;

    expect(resolveEditableTarget(childText)).toBe(composer);
  });

  it("does not treat ARIA textbox placeholder text as user text", () => {
    document.body.innerHTML = `<div id="composer" role="textbox" aria-placeholder="What is happening?">What is happening?</div>`;

    const composer = document.getElementById("composer") as HTMLElement;

    expect(getEditableText(composer)).toBe("");
  });

  it("does not treat nested placeholder nodes as user text", () => {
    document.body.innerHTML = `
      <div id="composer" role="textbox" aria-placeholder="What is happening?">
        <span data-placeholder="What is happening?">What is happening?</span>
      </div>
    `;

    const composer = document.getElementById("composer") as HTMLElement;

    expect(getEditableText(composer)).toBe("");
  });

  it("does not treat Feishu Slate placeholder nodes or editor fillers as user text", () => {
    document.body.innerHTML = `
      <div contenteditable="true" data-slate-editor="true">
        <div data-node="true"><div data-line-wrapper="true">
          <span data-void="true" contenteditable="false">
            <span class="editor__custom--placeholder">
              <span class="editor__custom--placeholder-content">可以向自己发送文件或转发消息</span>
            </span>
          </span>
          <span data-leaf="true"><span data-string="true" data-enter="true">\u200B</span></span>
          <span data-zero-space="true">\u200B</span>
        </div></div>
      </div>
    `;

    const composer = document.querySelector("[data-slate-editor]") as HTMLElement;

    expect(getEditableText(composer)).toBe("");
  });

  it("keeps user text while excluding a nested placeholder node", () => {
    document.body.innerHTML = `
      <div id="composer" role="textbox" aria-placeholder="What is happening?">
        <span data-placeholder="What is happening?">What is happening?</span>
        <span>你好</span>
      </div>
    `;

    const composer = document.getElementById("composer") as HTMLElement;

    expect(getEditableText(composer)).toBe("你好");
  });

  it("reads only values from native fields with placeholders", () => {
    document.body.innerHTML = `
      <input id="input" type="text" placeholder="Search here" />
      <textarea id="textarea" placeholder="Write here"></textarea>
    `;

    expect(getEditableText(document.getElementById("input") as HTMLInputElement)).toBe("");
    expect(getEditableText(document.getElementById("textarea") as HTMLTextAreaElement)).toBe("");
  });

  it("extracts input and contenteditable text", () => {
    document.body.innerHTML = `
      <input id="input" type="text" />
      <div id="editable" contenteditable="true">你好</div>
    `;

    const input = document.getElementById("input") as HTMLInputElement;
    input.value = "hello";

    expect(getEditableText(input)).toBe("hello");
    expect(getEditableText(document.getElementById("editable") as HTMLElement)).toBe("你好");
  });

  it("counts visible non-whitespace characters", () => {
    expect(hasMinimumVisibleChars(" 你 ", 2)).toBe(false);
    expect(hasMinimumVisibleChars(" 你好 ", 2)).toBe(true);
    expect(hasMinimumVisibleChars(" a b ", 2)).toBe(true);
  });
});
