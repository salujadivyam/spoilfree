# Security Policy

## Reporting a vulnerability
Please do not open a public issue for security problems. Use GitHub's **Report a vulnerability** button under the repository's Security tab, or email divyam.adt@gmail.com.

Include the affected file or version, steps to reproduce, and the impact you expect. You should get a reply within a few days.

## Supported versions
Only the latest release on the main branch receives fixes.

## Design notes
- The extension requests only the `storage` permission and two host permissions (the detection API and TVMaze).
- Content scripts skip email, chat, payment, password-manager and login pages, and any page with a visible password field.
- Text sent to the detection API is capped at 500 characters and stripped of links, emails and long digit runs.
- Responses from the API and TVMaze are treated as untrusted: types are checked, sizes are capped, and values are only ever written with `textContent`.
- The extension-pages CSP limits network connections to the two hosts above.
