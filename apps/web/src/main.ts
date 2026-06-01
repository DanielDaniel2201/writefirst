document.querySelectorAll<HTMLAnchorElement>("[data-download-link]").forEach((link) => {
  link.addEventListener("click", () => {
    link.dataset.state = "started";
  });
});
