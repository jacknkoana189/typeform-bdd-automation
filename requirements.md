# Requirements

`npm run setup` checks all of this for you and installs what it can. This file
is only for reference if the setup script reports a problem.

- **Node.js 18 or newer** with npm. Download from https://nodejs.org.
- **Internet access.** The tests run against the live Typeform, and the first
  setup downloads npm packages plus Playwright's Chromium build (~150 MB).
- **Playwright Chromium browser.** Installed automatically by the setup
  script; the manual command is `npx playwright install chromium`.

No global installs are required. Everything lives in `node_modules` and
Playwright's browser cache.
