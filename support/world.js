const { setWorldConstructor, setDefaultTimeout, BeforeAll, AfterAll, Before, After, Status } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const isHeaded = () => process.env.HEADLESS === 'false';
const keepBrowserOpen = () => isHeaded() || process.env.KEEP_BROWSER_OPEN === 'true';

let sharedBrowser = null;
let lastOpenPage = null;

class TypeformWorld {
  constructor({ attach, log, parameters } = {}) {
    this.attach = attach;
    this.log = log;
    this.parameters = parameters;
    this.browser = null;
    this.page = null;
    this.testDataUrl = 'https://luckybeardsurvey.typeform.com/to/ZRbAsk1c';
    this.scenarioName = '';
  }
}

setWorldConstructor(TypeformWorld);

// Steps drive a real browser through animated question transitions,
// so they need far more than Cucumber's 5 second default.
setDefaultTimeout(60 * 1000);

BeforeAll(async function () {
  // Ensure reports directory exists
  const reportsDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  if (isHeaded()) {
    const slowMo = parseInt(process.env.SLOW_MO || '0', 10);
    sharedBrowser = await chromium.launch({
      headless: false,
      slowMo: Number.isNaN(slowMo) ? 0 : slowMo
    });
    console.log('Headed mode: browser will stay open after the run (Ctrl+C to exit)');
  }
});

Before(async function ({ pickle }) {
  this.scenarioName = pickle.name;
  console.log(` Starting scenario: ${pickle.name}`);

  if (isHeaded()) {
    this.browser = sharedBrowser;
  } else {
    this.browser = await chromium.launch({ headless: true });
  }

  this.page = await this.browser.newPage({
    viewport: { width: 1280, height: 720 }
  });

  // Set default navigation timeout

  this.page.setDefaultTimeout(parseInt(process.env.TEST_TIMEOUT || '10000'));
  this.page.setDefaultNavigationTimeout(parseInt(process.env.TEST_TIMEOUT || '10000'));
});

After(async function (scenario) {
  const status = scenario.result && scenario.result.status;
  const passed = status === Status.PASSED;
  const failed = status === Status.FAILED;

  if (failed) {
    console.log(`\n❌ Scenario failed: ${scenario.pickle.name}`);
  } else if (passed) {
    console.log(`✅ Scenario passed: ${scenario.pickle.name}`);
  }

  // Capture a screenshot for every scenario and embed it in the HTML/JSON reports

  if (this.page) {
    try {
      const screenshotDir = path.join(__dirname, '../reports/screenshots');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      const safeName = scenario.pickle.name.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const label = failed ? 'FAILED' : 'PASSED';
      const screenshotPath = path.join(screenshotDir, `${safeName}_${label}_${timestamp}.png`);

      const png = await this.page.screenshot({ path: screenshotPath, fullPage: true });
      await this.attach(png, 'image/png');
      await this.attach(
        `${label} screenshot: ${path.basename(screenshotPath)}`,
        'text/plain'
      );
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  }

  if (keepBrowserOpen()) {

    // Keep only the latest tab open for inspection; close earlier ones.

    if (lastOpenPage && lastOpenPage !== this.page) {
      try {
        await lastOpenPage.close();
      } catch (error) {
        console.warn('Error closing previous page:', error);
      }
    }
    lastOpenPage = this.page;
    return;
  }

  if (this.page) {
    try {
      await this.page.close();
    } catch (error) {
      console.warn('Error closing page:', error);
    }
  }

  if (this.browser && this.browser !== sharedBrowser) {
    try {
      await this.browser.close();
    } catch (error) {
      console.warn('Error closing browser:', error);
    }
  }
});

AfterAll(async function () {
  console.log('All scenarios completed');

  if (keepBrowserOpen() && sharedBrowser) {
    console.log('Browser left open for inspection. Press Ctrl+C when you are done.\n');
    await new Promise(() => {});
    
    // keep process (and browser) alive
  }
});
