# SpoilFree 🛡️

SpoilFree is a Google Chrome extension that helps users avoid accidental spoilers while browsing the web. It automatically detects spoiler-heavy text on webpages and blurs it in real time, allowing users to reveal content only when they choose.

## Features
- Automatically detects and blurs spoiler-related text
- Works dynamically on sites like Google, Reddit, Quora, Wikipedia, and more
- Click to reveal spoilers and click again to hide them
- Toggle the extension on or off at any time
- Live counter showing how many spoilers have been blocked
- Privacy-first design with no tracking or data storage

## How it works
SpoilFree analyzes visible text content on a webpage and sends selected text snippets to a remote AI-powered API for spoiler classification. If a spoiler is detected, the text is blurred directly in the browser. All logic runs locally in the extension, and only minimal text is sent for classification.

## Tech Stack
- **Frontend:** Chrome Extension (Manifest V3)
- **Browser Logic:** JavaScript, DOM parsing, MutationObserver, Chrome Storage API
- **Backend API:** FastAPI (hosted separately)
- **NLP Model:** DistilBERT (fine-tuned for binary spoiler classification)
- **Deployment:** Hugging Face Spaces

## Privacy
SpoilFree does not collect, store, or sell personal user data.  
Only visible text snippets are temporarily sent to an external API for spoiler detection. All user preferences and counters are stored locally in the browser.

## Installation
SpoilFree is available on the Chrome Web Store.  
(Link will be added once the extension is published.)

## Status
This repository contains only the Chrome extension source code.  
The backend API and machine learning model are maintained separately.

---

Built as a hands-on project to explore real-world applications of NLP, browser extensions, and end-to-end product deployment.
