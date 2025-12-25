const API_URL = "https://salujadivyam-spoilfree.hf.space/predict";
let SPOILFREE_ENABLED = false;
const BLUR_CLASS = "spoilfree-blur";
const processed = new WeakSet();
chrome.storage.local.get({ enabled: true }, (data) => {
    SPOILFREE_ENABLED = data.enabled;
    if (SPOILFREE_ENABLED) {
        run();
    }
});

function getTextElements() {
    return Array.from(
        document.querySelectorAll(
            "p, li, h1, h2, h3, div[data-click-id='text'], div[data-testid='comment']"
        )
    ).filter(el =>
        el.innerText &&
        el.innerText.length > 40 &&
        el.innerText.length < 500 &&
        !el.closest("nav") &&
        !el.closest("header")
    );
}
async function checkForSpoiler(el) {
    if (!SPOILFREE_ENABLED) return;
    if (processed.has(el)) return;
    processed.add(el);

    const text = el.innerText.trim();
    if (!text) return;

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        const data = await res.json();
        if (!data.spoiler) return;
        const span = document.createElement("span");
        span.className = BLUR_CLASS;
        span.textContent = text;
        span.dataset.hidden = "true";

        span.addEventListener("click", (e) => {
            e.stopPropagation();
            span.classList.toggle(BLUR_CLASS);
            span.dataset.hidden =
                span.dataset.hidden === "true" ? "false" : "true";
        });

        el.innerHTML = "";
        el.appendChild(span);
        chrome.storage.local.get({ spoilerCount: 0 }, (data) => {
        chrome.storage.local.set({
        spoilerCount: data.spoilerCount + 1
    });
});

    } catch (err) {
        console.warn("SpoilFree API error:", err);
    }
}
function run() {
    getTextElements().forEach(checkForSpoiler);
}
chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
        SPOILFREE_ENABLED = changes.enabled.newValue;
    }
});

new MutationObserver(run).observe(document.body, {
    childList: true,
    subtree: true
});
