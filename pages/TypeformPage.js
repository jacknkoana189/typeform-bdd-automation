const FORM_URL = 'https://luckybeardsurvey.typeform.com/to/ZRbAsk1c';
const TEXT_INPUT = 'input[placeholder*="Type your answer"]';
const START_BUTTON = 'button:has-text("Start")';
const OK_BUTTON = 'button:has-text("OK"), button:has-text("Submit")';
const CHOICE = '[role="radio"], [role="checkbox"]';
const ENDING = '[data-qa*="thank-you-screen-visible"]';

class TypeformPage {
  constructor(page) {
    this.page = page;
  }

  // The question block Typeform currently has in focus//

  focused() {
    return this.page.locator('[data-qa-block="true"][data-qa-focused="true"]');
  }

  async focusedId() {
    return this.focused().first().getAttribute('id', { timeout: 1000 }).catch(() => null);
  }

  // Poll a condition until it returns true or the timeout elapses//

  async poll(check, timeout, interval = 200) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await check()) return true;
      await this.page.waitForTimeout(interval);
    }
    return false;
  }

  // Wait until the focused block's position is stable — Typeform animates between questions and silently ignores clicks while moving//

  async settle(timeout = 6000) {
    let prevY = null;
    await this.poll(async () => {
      const box = await this.focused().first().boundingBox().catch(() => null);
      const y = box ? box.y : null;
      const stable = y !== null && prevY !== null && Math.abs(y - prevY) < 2;
      prevY = y;
      return stable;
    }, timeout, 300);
  }

  // First match whose center is actually inside the viewport — Typeform keeps every question mounted in the DOM, so selectors can hit hidden elements//

  async firstInViewport(locator, timeout = 5000) {
    const { height } = this.page.viewportSize() || { height: 720 };
    let found = null;
    const ok = await this.poll(async () => {
      for (let i = 0, count = await locator.count(); i < count; i++) {
        const el = locator.nth(i);
        if (!(await el.isVisible().catch(() => false))) continue;
        const box = await el.boundingBox().catch(() => null);
        const centerY = box && box.y + box.height / 2;
        if (box && centerY >= 0 && centerY <= height) {
          found = el;
          return true;
        }
      }
      return false;
    }, timeout);
    if (!ok) throw new Error(`No element for "${locator}" visible in the viewport after ${timeout}ms`);
    return found;
  }

  // Instant check for the ending (thank you / decline) screen//

  async isEnded() {
    return (await this.page.locator(ENDING).count()) > 0;
  }

  // Like isEnded, but waits for the submit round-trip to finish//

  async isSubmitted() {
    return this.page.locator(ENDING).first().waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true).catch(() => false);
  }

//Start button appearing is the real "form is ready" signal//

  async navigate() {
    await this.page.goto(FORM_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.page.locator(START_BUTTON).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  }

  async clickStart() {
    const button = await this.firstInViewport(this.page.locator(START_BUTTON), 10000);
    await button.click();
    await this.waitForFirstQuestion();
  }

  async waitForFirstQuestion() {
    await this.page.locator(TEXT_INPUT).first().waitFor({ state: 'visible', timeout: 10000 });
    await this.settle();
  }

  async fillName(name) {
    const input = await this.firstInViewport(this.page.locator(TEXT_INPUT));
    await input.fill(name);
    if (!(await this.poll(async () => (await input.inputValue()) === name, 3000))) {
      throw new Error(`Name input did not accept "${name}"`);
    }
  }

  // The name question may be scrolled away, but it stays mounted in the DOM.//

  async nameValue() {
    return this.page.locator(TEXT_INPUT).first().inputValue().catch(() => '');
  }

  // The focused block labels itself via an "<blockId>-title" element//

  async currentQuestion() {
    const title = await this.focused().locator('[id$="-title"]').first()
      .textContent({ timeout: 3000 }).catch(() => null);
    return (title || '').trim();
  }

  async hasError() {
    await this.settle();

    // Answered questions stay mounted behind the ending screen; nothing there counts//

    if (await this.isEnded()) return false;
    const errors = this.page
      .locator('[data-qa*="error"], [role="alert"]')
      .or(this.page.getByText(/please fill|please make a selection|please select|required/i));
    return this.firstInViewport(errors, 3000).then(() => true).catch(() => false);
  }

  async successMessage() {
    const text = await this.page.locator(ENDING).first().textContent({ timeout: 8000 }).catch(() => '');
    return (text || '').trim();
  }

  //then fall back to clicking the focused OK button, which also surfaces validation errors on unanswered questions//

  async clickOk() {
    await this.settle();

    // Leftover OK buttons after submit would navigate back//

    if (await this.isEnded()) return;
    await this.page.keyboard.press('Enter');
    await this.settle();
    if (await this.isEnded()) return;
    try {
      const button = await this.firstInViewport(this.focused().locator(OK_BUTTON), 3000);
      await button.click();
      await this.settle();
    } catch {

      // No OK button on the focused question; the form already advanced//

    }
  }

  async clickBack() {
    const button = this.page.locator('button[aria-label*="previous"]').first();
    await button.waitFor({ state: 'visible', timeout: 5000 });
    if (!(await button.isDisabled())) {
      await button.click();
      await this.settle();
    }
  }

  // Click a choice (radio/checkbox) by its visible label//

  async selectChoice(text) {
    const deadline = Date.now() + 20000;
    for (;;) {
      await this.settle();
      const option = await this.firstInViewport(this.focused().locator(CHOICE).filter({ hasText: text }), 2500)
        .catch(() => this.firstInViewport(this.page.locator(CHOICE).filter({ hasText: text }), 5000))
        .catch(() => null);
      if (option) {
        if ((await option.getAttribute('aria-checked').catch(() => null)) === 'true') return this.settle();
        await option.click({ force: true });
        const registered = await this.poll(async () =>
          (await this.isEnded()) ||
          (await option.getAttribute('aria-checked').catch(() => null)) === 'true', 2500);
        if (registered) return this.settle();
      }
      if (Date.now() > deadline) throw new Error(`Selecting choice "${text}" did not register within 20s`);
    }
  }

  //earlier answers stay mounted in the DOM, so scope to the focused block, press the option's shortcut letter, then verify the selection registered//

  async selectYesNo(answer) {
    await this.settle();
    const blockId = await this.focusedId();
    const option = this.focused().getByRole('radio', { name: answer, exact: true });
    await option.waitFor({ state: 'visible', timeout: 15000 });

    // Already selected (e.g. after navigating back) — pressing again would toggle it off.

    if ((await option.getAttribute('aria-checked').catch(() => null)) === 'true') return;

    const letter = ((await option.innerText()) || '').trim().match(/^[A-Za-z]/);
    for (let attempt = 0; attempt < 3; attempt++) {
      if (letter) await this.page.keyboard.press(letter[0].toLowerCase());
      else await option.click({ force: true });

      const done = await this.poll(async () => {
        if (await this.isEnded()) return true;

        // Focus moving to another block means the answer auto-advanced the form//

        const focusedId = await this.focusedId();
        if (blockId && focusedId && focusedId !== blockId) return true;
        if ((await option.getAttribute('aria-checked').catch(() => null)) !== 'true') return false;

        // Re-check after a pause — the selection can bounce during re-render.

        await this.page.waitForTimeout(300);
        return (await option.getAttribute('aria-checked').catch(() => null)) === 'true';
      }, 5000);
      if (done) return;
    }
    throw new Error(`Choice "${answer}" was not selected on the focused question`);
  }

  //answering one auto-advances to the next, so keep answering until focus leaves them//

  async answerAgreement(answer) {
    const deadline = Date.now() + 30000;
    let lastAnswered = null;
    for (;;) {
      if (await this.isEnded()) return;
      await this.settle();
      const blockId = await this.focusedId();
      const isAgreement = /understand|acknowledge/i.test(await this.currentQuestion());
      if (isAgreement && blockId && blockId !== lastAnswered) {
        await this.selectYesNo(answer);
        lastAnswered = blockId;
        await this.poll(async () => (await this.isEnded()) || (await this.focusedId()) !== lastAnswered, 2500);
      } else if (lastAnswered) {
        return;
      } else if (Date.now() > deadline) {
        throw new Error('Agreement question did not appear within 30s');
      } else {
        await this.page.waitForTimeout(300);
      }
    }
  }
}

module.exports = { TypeformPage };
