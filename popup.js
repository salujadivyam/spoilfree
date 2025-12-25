const toggle = document.getElementById("toggle");
const spoilerCountEl = document.getElementById("spoilerCount");
chrome.storage.local.get(
  { enabled: true, spoilerCount: 0 },
  (data) => {
    toggle.checked = data.enabled;
    spoilerCountEl.textContent = data.spoilerCount;
  }
);
toggle.addEventListener("change", () => {
  chrome.storage.local.set({
    enabled: toggle.checked
  });
});
