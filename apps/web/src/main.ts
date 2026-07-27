document.querySelectorAll<HTMLAnchorElement>("[data-download-link]").forEach((link) => {
  link.addEventListener("click", () => {
    link.dataset.state = "started";
    const label = link.querySelector<HTMLElement>("[data-download-label]");

    if (label) {
      label.textContent = "已开始下载";
    }
  });
});
