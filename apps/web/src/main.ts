const downloadLink = document.querySelector<HTMLAnchorElement>("[data-download-link]");

if (downloadLink) {
  downloadLink.addEventListener("click", () => {
    downloadLink.dataset.state = "started";
  });
}
