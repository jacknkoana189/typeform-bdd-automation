const { setDefaultTimeout, BeforeAll, AfterAll, Before, After, Status } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { TypeformPage } = require('../pages/TypeformPage');

const isHeaded = () => process.env.HEADLESS === 'false';

let sharedBrowser = null;
let lastOpenPage = null;

// Steps drive a real browser through animated question transitions, so they need far more than Cucumber's 5 second default.

setDefaultTimeout(60 * 1000);

BeforeAll(async function () {

  // Start every run with a fresh screenshots folder — old screenshots are removed.

  const screenshotsDir = path.join(__dirname, '../reports/screenshots');
  fs.rmSync(screenshotsDir, { recursive: true, force: true });
  fs.mkdirSync(screenshotsDir, { recursive: true });
  if (isHeaded()) {
    sharedBrowser = await chromium.launch({
      headless: false,
      slowMo: parseInt(process.env.SLOW_MO || '0', 10) || 0,
    });
    console.log('Headed mode: browser will stay open after the run (Ctrl+C to exit)');
  }
});

Before(async function ({ pickle }) {
  console.log(`Starting scenario: ${pickle.name}`);
  this.browser = sharedBrowser || (await chromium.launch({ headless: true }));
  this.page = await this.browser.newPage({ viewport: { width: 1280, height: 720 } });
  const timeout = parseInt(process.env.TEST_TIMEOUT || '10000', 10);
  this.page.setDefaultTimeout(timeout);
  this.page.setDefaultNavigationTimeout(timeout);
  this.form = new TypeformPage(this.page);
});

After(async function (scenario) {
  const failed = scenario.result && scenario.result.status === Status.FAILED;
  const label = failed ? 'FAILED' : 'PASSED';
  console.log(`${failed ? '❌' : '✅'} Scenario ${label.toLowerCase()}: ${scenario.pickle.name}`);

  // Capture a screenshot for every scenario (pass and fail) and embed it in the reports.

  try {
    const safeName = scenario.pickle.name.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(__dirname, `../reports/screenshots/${safeName}_${label}_${timestamp}.png`);
    const png = await this.page.screenshot({ path: file, fullPage: true });
    await this.attach(png, 'image/png');
    await this.attach(`${label} screenshot: ${path.basename(file)}`, 'text/plain');
    console.log(`📸 Screenshot saved: ${file}`);
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
  }

  if (isHeaded()) {

    // Keep only the latest tab open for inspection; close earlier ones.

    if (lastOpenPage && lastOpenPage !== this.page) await lastOpenPage.close().catch(() => {});
    lastOpenPage = this.page;
  } else {
    await this.page.close().catch(() => {});
    await this.browser.close().catch(() => {});
  }
});

// AfterAll(async function () {
//   console.log('All scenarios completed');
//   if (isHeaded() && sharedBrowser) {
//     console.log('Browser left open for inspection. Press Ctrl+C when you are done.');

//     // Keep the  browser open.

//     await new Promise(() => {});
//   }
// });
