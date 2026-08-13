type Locale = "en" | "zh";

const translations = {
  en: {
    htmlLang: "en",
    switchLabel: "中文版",
    headlineLead: "Say what you truly want to say first,",
    headlineBridge: "then see",
    demoText: "how to say it in your target language",
    cardText: "用你的目标语言怎么说",
    cardLabel: "Write First translation card preview",
    cta: "Add to Chrome",
    downloading: "Downloading…",
    installHint: ["Download & unzip", "Open chrome://extensions", "Load unpacked"],
    description:
      "Say what you truly want to say first, then see how to say it in your target language."
  },
  zh: {
    htmlLang: "zh-CN",
    switchLabel: "English",
    headlineLead: "先表达真正想说的话，",
    headlineBridge: "再看",
    demoText: "目标语言怎么说",
    cardText: "How do you say it in the target language?",
    cardLabel: "Write First 翻译卡片效果预览",
    cta: "下载 Chrome 扩展",
    downloading: "正在下载…",
    installHint: ["下载并解压", "打开 chrome://extensions", "加载已解压的扩展程序"],
    description: "先表达真正想说的话，再看目标语言怎么说。"
  }
} as const;

const languageSwitch = document.querySelector<HTMLButtonElement>("[data-language-switch]");
const card = document.querySelector<HTMLElement>(".translation-card");
const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
const installHint = document.querySelector<HTMLElement>("[data-copy='installHint']");
const downloadLink = document.querySelector<HTMLAnchorElement>("[data-download-link]");

let locale: Locale = "en";

function render(nextLocale: Locale) {
  locale = nextLocale;
  const copy = translations[locale];

  document.documentElement.lang = copy.htmlLang;
  document.body.dataset.locale = locale;
  description?.setAttribute("content", copy.description);

  document.querySelectorAll<HTMLElement>("[data-copy]").forEach((element) => {
    const key = element.dataset.copy as keyof typeof copy;
    const value = copy[key];

    if (typeof value === "string") {
      element.textContent = value;
    }
  });

  if (languageSwitch) {
    languageSwitch.textContent = copy.switchLabel;
    languageSwitch.setAttribute(
      "aria-label",
      locale === "en" ? "Switch to Chinese" : "切换至英文"
    );
  }

  card?.setAttribute("aria-label", copy.cardLabel);

  if (installHint) {
    installHint.replaceChildren();
    copy.installHint.forEach((step, index) => {
      const label = document.createElement("span");
      label.textContent = step;
      installHint.append(label);

      if (index < copy.installHint.length - 1) {
        const separator = document.createElement("i");
        separator.setAttribute("aria-hidden", "true");
        installHint.append(separator);
      }
    });
  }
}

languageSwitch?.addEventListener("click", () => {
  const nextLocale = locale === "en" ? "zh" : "en";
  const url = new URL(window.location.href);

  if (nextLocale === "zh") {
    url.searchParams.set("lang", "zh");
  } else {
    url.searchParams.delete("lang");
  }

  window.history.replaceState({}, "", url);
  render(nextLocale);
});

downloadLink?.addEventListener("click", () => {
  downloadLink.dataset.state = "started";
  const cta = downloadLink.querySelector<HTMLElement>("[data-copy='cta']");

  if (cta) {
    cta.textContent = translations[locale].downloading;
  }
});

const initialLocale = new URLSearchParams(window.location.search).get("lang") === "zh" ? "zh" : "en";
render(initialLocale);
