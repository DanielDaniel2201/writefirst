document.querySelectorAll<HTMLAnchorElement>("[data-download-link]").forEach((link) => {
  link.addEventListener("click", () => {
    link.dataset.state = "started";
  });
});

document.querySelectorAll<HTMLElement>("[data-faq-root]").forEach((root) => {
  const items = Array.from(root.querySelectorAll<HTMLElement>(".faq-item"));

  items.forEach((item) => {
    const trigger = item.querySelector<HTMLButtonElement>(".faq-trigger");
    const panel = item.querySelector<HTMLElement>(".faq-panel");
    const icon = trigger?.querySelector("span:last-child");

    if (!trigger || !panel || !icon) {
      return;
    }

    trigger.addEventListener("click", () => {
      const willExpand = trigger.getAttribute("aria-expanded") !== "true";

      items.forEach((otherItem) => {
        const otherTrigger = otherItem.querySelector<HTMLButtonElement>(".faq-trigger");
        const otherPanel = otherItem.querySelector<HTMLElement>(".faq-panel");
        const otherIcon = otherTrigger?.querySelector("span:last-child");

        if (!otherTrigger || !otherPanel || !otherIcon) {
          return;
        }

        const isCurrent = otherItem === item;
        otherTrigger.setAttribute("aria-expanded", isCurrent && willExpand ? "true" : "false");
        otherPanel.hidden = !(isCurrent && willExpand);
        otherIcon.textContent = isCurrent && willExpand ? "−" : "+";
      });
    });
  });
});
