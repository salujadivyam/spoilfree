# SpoilFree Privacy Policy

SpoilFree blurs text that may spoil a show or movie on your watchlist. This page says exactly what it does with your data.

## What stays on your device
- Your watchlist, progress, and settings are stored in `chrome.storage.local`. They never leave your browser except as described below.

## What is sent to the internet
1. **TVMaze (`api.tvmaze.com`)**: when you add a show, its name is sent to look up cast and episode titles. No cookies are sent.
2. **Detection API (`salujadivyam-spoilfree.hf.space`)**: SpoilFree sends short text snippets (500 characters at most) from the page you are viewing, but only snippets that mention a show on your watchlist, or that sit on a page whose title or URL names one. Before sending, links, email addresses and long digit sequences are removed. The page URL, your watchlist and your identity are not sent.

## What is not collected
- No browsing history, no page URLs, no account or login data, no analytics, no advertising identifiers.
- SpoilFree does not run on email, chat, banking, payment, password-manager or login pages.

## Retention
The developer of SpoilFree does not store any of the text snippets sent to the Detection API.

The Detection API runs on a Hugging Face Space. Requests are processed in memory and are not saved by the application. Hugging Face Spaces use ephemeral storage by default (nothing persists after a restart). Hugging Face may keep short-lived operational/debug logs, but does not store the content of the requests for training or long-term use.

See Hugging Face’s privacy policy for full details: https://huggingface.co/privacy

## Your controls
- Turn SpoilFree off from the popup at any time.
- Remove a show to delete its stored data, or uninstall the extension to remove everything.

## Contact
divyam.adt@gmail.com
