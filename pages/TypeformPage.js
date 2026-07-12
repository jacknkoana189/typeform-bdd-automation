class TypeformPage {
  constructor(page) {
    this.page = page;
    this.testFormUrl = 'https://luckybeardsurvey.typeform.com/to/ZRbAsk1c';

    // Main Typeform container selectors
    this.formContainer = 'div[role="main"], generic';
    this.startButton = 'button:has-text("Start")';
    this.okButton = 'button:has-text("OK"), button:has-text("Submit")';
    this.textInput = 'input[placeholder*="Type your answer"]';
    this.checkboxInput = 'input[role="checkbox"]';
    this.radioInput = 'input[role="radio"]';
    this.backButton = 'button[aria-label*="previous"]';
    this.forwardButton = 'button[aria-label*="next"]';
  }

  /**
   * Poll until an input reports the expected value (avoids fixed sleeps after fill/clear).
   */
  async expectInputValue(input, expected, timeout = 3000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const value = await input.inputValue().catch(() => null);
      if (value === expected) return;
      await this.page.waitForTimeout(100);
    }
    const actual = await input.inputValue().catch(() => '');
    throw new Error(`Expected input value "${expected}" but found "${actual}"`);
  }

  /**
   * Typeform keeps all questions mounted in the DOM and scrolls between them,
   * so selectors like the OK button can match several elements. This returns
   * the first match that is actually visible inside the viewport.
   */
  async firstInViewport(locator, timeout = 5000) {
    const viewport = this.page.viewportSize() || { width: 1280, height: 720 };
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const count = await locator.count();
      for (let i = 0; i < count; i++) {
        const element = locator.nth(i);
        const isVisible = await element.isVisible().catch(() => false);
        if (!isVisible) continue;

        const box = await element.boundingBox().catch(() => null);
        if (!box) continue;

        const centerY = box.y + box.height / 2;
        if (centerY >= 0 && centerY <= viewport.height) {
          return element;
        }
      }
      await this.page.waitForTimeout(200);
    }
    throw new Error(`No element for locator "${locator}" is visible in the viewport after ${timeout}ms`);
  }

  /**
   * The question block Typeform currently has in focus. Text questions render
   * as a div and choice questions as a fieldset, so match on the data-qa flags.
   */
  focusedBlock() {
    return this.page.locator('[data-qa-block="true"][data-qa-focused="true"]');
  }

  /**
   * The id of the currently focused question block, or null on ending screens.
   */
  async focusedBlockId() {
    return await this.focusedBlock().first().getAttribute('id', { timeout: 1000 }).catch(() => null);
  }

  /**
   * Wait until the scroll animation between questions has finished, i.e. the
   * focused block's position is stable. Clicks during the animation are
   * silently ignored by Typeform.
   */
  async waitForScrollToSettle(timeout = 6000) {
    const deadline = Date.now() + timeout;
    let prevY = null;
    while (Date.now() < deadline) {
      const box = await this.focusedBlock().first().boundingBox().catch(() => null);
      const y = box ? box.y : null;
      if (y !== null && prevY !== null && Math.abs(y - prevY) < 2) return;
      prevY = y;
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Escape a string for safe use inside a RegExp.
   */
  escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Choice buttons matching the given label inside a root locator.
   * Short labels like "Yes" / "No" stay scoped to the caller (focused
   * question) and exclude longer options that merely contain the word.
   */
  choiceButtons(root, text) {
    const trimmed = text.trim();
    const isShortLabel = trimmed.length <= 3;

    // Typeform choice rows are usually buttons with role=radio|checkbox,
    // but also match list items / divs that expose those roles.
    const buttons = root.locator(
      'button[role="radio"], button[role="checkbox"], [role="radio"], [role="checkbox"]'
    );

    if (isShortLabel) {
      // Match "Yes" / "A Yes" / "Yes Y", but not "Yes, I would like to participate".
      return buttons
        .filter({ hasText: new RegExp(`(^|[\\s\\n])${this.escapeRegExp(trimmed)}([\\s\\n]|$)`, 'i') })
        .filter({ hasNotText: /would like to participate|do not want to participate/i });
    }

    return buttons.filter({ hasText: text });
  }

  /**
   * Click a choice option by its visible text. Typeform renders choices as
   * button[role=radio|checkbox] elements whose labels may be decorated
   * (e.g. "Team Draw — R100"), so longer labels match by substring. Short
   * labels ("Yes"/"No") are matched within the focused question only so
   * they cannot hit a previous question still mounted in the DOM. Clicks
   * during scroll animation sometimes don't register, so we verify and retry.
   */
  async clickChoiceByText(text) {
    const optionIn = (root) => this.choiceButtons(root, text);
    const deadline = Date.now() + 20000;
    const shortLabel = text.trim().length <= 3;

    for (;;) {
      await this.waitForScrollToSettle();

      let option = null;
      try {
        option = await this.firstInViewport(optionIn(this.focusedBlock()), 2500);
      } catch {
        if (shortLabel) {
          try {
            // Typeform sometimes puts role=radio on a wrapper around "A" + "Yes".
            const label = this.focusedBlock()
              .getByText(text, { exact: true })
              .locator('xpath=ancestor-or-self::*[@role="radio" or @role="checkbox" or self::button][1]');
            option = await this.firstInViewport(label, 2000);
          } catch {
            // Question may still be scrolling into focus — keep retrying until deadline.
            if (Date.now() > deadline) {
              throw new Error(
                `Could not find focused choice "${text}" on the current question within 20s. ` +
                'Refusing page-wide fallback for short labels to avoid clicking a previous answer.'
              );
            }
            await this.page.waitForTimeout(300);
            continue;
          }
        } else {
          try {
            option = await this.firstInViewport(optionIn(this.page), 5000);
          } catch (pageError) {
            if (Date.now() > deadline) throw pageError;
            await this.page.waitForTimeout(300);
            continue;
          }
        }
      }

      const ownBlockId = await option
        .locator('xpath=ancestor::*[@data-qa-block="true"][1]')
        .getAttribute('id')
        .catch(() => null);

      // Already selected (e.g. after navigating back) — no need to click again.
      const already = await option.getAttribute('aria-checked').catch(() => null);
      if (already === 'true') {
        await this.waitForScrollToSettle();
        return;
      }

      await option.click({ force: true });

      if (!ownBlockId) {
        await this.waitForScrollToSettle();
        return;
      }

      const verified = await this.verifyChoiceRegistered(optionIn, ownBlockId);
      if (verified) {
        await this.waitForScrollToSettle();
        return;
      }

      if (shortLabel) {
        const focusedId = await this.focusedBlockId();
        if (focusedId && ownBlockId && focusedId !== ownBlockId) {
          await this.waitForScrollToSettle();
          return;
        }
        if (await this.isEndingScreenVisible()) {
          return;
        }
      }

      if (Date.now() > deadline) {
        throw new Error(`Selecting choice "${text}" did not register within 20s`);
      }
    }
  }

  /**
   * Confirm a clicked choice actually registered. Prefer aria-checked=true.
   * Focus changing alone is not enough — Typeform can briefly re-focus during
   * re-render while the option is still unselected.
   */
  async verifyChoiceRegistered(optionIn, ownBlockId) {
    const block = this.page.locator(`[id="${ownBlockId}"]`);

    for (let attempt = 0; attempt < 10; attempt++) {
      if (await this.page.locator('[data-qa*="thank-you-screen-visible"]').count() > 0) {
        return true;
      }

      if (await block.count() === 0) {
        return true;
      }

      const state = await optionIn(block).first().getAttribute('aria-checked').catch(() => null);
      if (state === 'true') {
        return true;
      }

      const focusedId = await this.focusedBlockId();
      if (focusedId && focusedId !== ownBlockId) {
        // Truly advanced only if the answer stuck on the previous block.
        const previousState = await optionIn(block).first().getAttribute('aria-checked').catch(() => null);
        return previousState === 'true';
      }

      if (state === 'false') {
        return false;
      }

      await this.page.waitForTimeout(250);
    }
    return false;
  }

  /**
   * Select a radio-style choice. For plain "Yes"/"No", scope to the focused
   * question (earlier "Yes" answers stay mounted) and press the letter key
   * from the label ("Y\\nYes" -> "y", "A\\nYes" -> "a").
   */
  async selectRadioByText(text) {
    const trimmed = text.trim();
    if (/^yes$/i.test(trimmed) || /^no$/i.test(trimmed)) {
      await this.waitForScrollToSettle();

      const ownBlockId = await this.focusedBlockId();
      const option = this.focusedBlock().getByRole('radio', { name: trimmed, exact: true });
      await option.waitFor({ state: 'visible', timeout: 15000 });

      // Already selected (e.g. re-focused block) — pressing the shortcut
      // again could toggle it off, so leave it alone.
      if ((await option.getAttribute('aria-checked').catch(() => null)) === 'true') {
        return;
      }

      const label = ((await option.innerText()) || '').replace(/\s+/g, ' ').trim();
      const letterMatch = label.match(/^([A-Za-z])\b/);
      const letter = letterMatch ? letterMatch[1].toLowerCase() : null;

      for (let attempt = 0; attempt < 3; attempt++) {
        if (letter) {
          await this.page.keyboard.press(letter);
        } else {
          await option.click({ force: true });
        }

        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
          // The answer registering can auto-advance the form; once focus has
          // left this block (or the ending screen shows), we are done.
          if (await this.isEndingScreenVisible()) {
            return;
          }
          const focusedId = await this.focusedBlockId();
          if (ownBlockId && focusedId && focusedId !== ownBlockId) {
            return;
          }

          const state = await option.getAttribute('aria-checked').catch(() => null);
          const dataState = await option.getAttribute('data-state').catch(() => null);
          if (state === 'true' || dataState === 'checked') {
            // Brief pause then re-check — selection can bounce during re-render.
            await this.page.waitForTimeout(300);
            const state2 = await option.getAttribute('aria-checked').catch(() => null);
            if (state2 === 'true') {
              return;
            }
          }
          await this.page.waitForTimeout(200);
        }
      }

      throw new Error(`Choice "${trimmed}" (label "${label}") was not selected on the focused question`);
    }

    await this.clickChoiceByText(text);
    await this.waitForScrollToSettle();
  }

  /**
   * Whether the focused question currently has the given short choice selected.
   */
  async isFocusedChoiceSelected(text) {
    const option = this.choiceButtons(this.focusedBlock(), text).first();
    const state = await option.getAttribute('aria-checked').catch(() => null);
    if (state === 'true') return true;

    // Some Typeform builds expose selection on a child/parent wrapper.
    const wrapperState = await option
      .locator('xpath=ancestor-or-self::*[@aria-checked][1]')
      .getAttribute('aria-checked')
      .catch(() => null);
    return wrapperState === 'true';
  }

  /**
   * Answer the agreement/acknowledgement question(s). The live form contains
   * two consecutive blocks with the same "I understand ... I acknowledge and
   * agree." title; answering the first auto-advances to the second, so keep
   * answering until focus leaves the agreement blocks (or the ending shows).
   */
  async answerAgreementQuestions(option) {
    const deadline = Date.now() + 30000;
    let lastAnswered = null;

    for (;;) {
      if (await this.isEndingScreenVisible()) return;
      await this.waitForScrollToSettle();

      const blockId = await this.focusedBlockId();
      const question = (await this.getCurrentQuestion()).toLowerCase();
      const isAgreement = question.includes('understand') || question.includes('acknowledge');

      if (isAgreement && blockId && blockId !== lastAnswered) {
        await this.selectRadioByText(option);
        lastAnswered = blockId;

        // Give the auto-advance a moment to move focus to a follow-up
        // agreement block (or straight to the ending screen).
        const settleUntil = Date.now() + 2500;
        while (Date.now() < settleUntil) {
          if (await this.isEndingScreenVisible()) return;
          const current = await this.focusedBlockId();
          if (current && current !== lastAnswered) break;
          await this.page.waitForTimeout(250);
        }
        continue;
      }

      // Focused block is no longer an unanswered agreement question.
      if (lastAnswered) return;

      if (Date.now() > deadline) {
        throw new Error('Agreement question did not appear within 30s');
      }
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Click a choice option (checkbox-style) by its visible text.
   */
  async selectCheckboxByText(text) {
    await this.clickChoiceByText(text);
    await this.waitForScrollToSettle();
  }

  /**
   * Navigate to the Typeform competition entry page
   */
  async navigate() {
    await this.page.goto(this.testFormUrl, { waitUntil: 'networkidle' });
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Click the Start button on the welcome page
   */
  async clickStartButton() {
    const button = await this.firstInViewport(this.page.locator(this.startButton), 10000);
    await button.click();
    await this.page.locator(this.textInput).first().waitFor({ state: 'visible', timeout: 10000 });
    await this.waitForScrollToSettle();
  }

  /**
   * Wait for the first form question to load
   */
  async waitForFirstQuestion() {
    const input = this.page.locator(this.textInput);
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await this.waitForScrollToSettle();
  }

  /**
   * Wait for the Typeform to load completely
   */
  async waitForTypeformLoad() {
    await this.focusedBlock().first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await this.waitForScrollToSettle();
  }

  /**
   * Get the current question text
   */
  async getCurrentQuestion() {
    // The focused fieldset labels itself via an "<blockId>-title" element
    try {
      const title = this.focusedBlock().locator('[id$="-title"]').first();
      const text = await title.textContent({ timeout: 3000 });
      if (text && text.trim()) return text.trim();
    } catch {
      // fall through to heading lookup
    }
    try {
      const heading = await this.firstInViewport(this.page.locator('[role="heading"]'), 2000);
      const questionText = await heading.textContent();
      return questionText ? questionText.trim() : '';
    } catch {
      return '';
    }
  }

  /**
   * Fill the name input field
   */
  async fillNameField(name) {
    const input = await this.firstInViewport(this.page.locator(this.textInput));
    await input.clear();
    await input.fill(name);
    await this.expectInputValue(input, name);
  }

  /**
   * Clear the name input field
   */
  async clearNameField() {
    const input = await this.firstInViewport(this.page.locator(this.textInput));
    await input.clear();
    await this.expectInputValue(input, '');
  }

  /**
   * Fill a text input field with value
   */
  async fillTextInput(value) {
    const input = await this.firstInViewport(this.page.locator(this.textInput));
    await input.fill(value);
    await this.expectInputValue(input, value);
  }

  /**
   * Get the current name input value
   */
  async getNameInputValue() {
    try {
      const input = await this.firstInViewport(this.page.locator(this.textInput), 3000);
      return await input.inputValue();
    } catch {
      // The form may have scrolled past the name question; it stays mounted
      // in the DOM, so read the first text input's value directly.
      return await this.page.locator(this.textInput).first().inputValue().catch(() => '');
    }
  }

  /**
   * Check if a choice option is currently selected (via aria-checked on the option wrapper)
   */
  async isCheckboxSelected(text) {
    try {
      const option = await this.firstInViewport(this.page.locator(`text="${text}"`), 2000);
      const wrapper = option.locator('xpath=ancestor-or-self::*[@aria-checked][1]');
      const state = await wrapper.getAttribute('aria-checked');
      return state === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Click the OK/Next button
   */
  async clickOkButton() {
    // Let any auto-advance scroll animation from a previous answer settle
    await this.waitForScrollToSettle();

    // Answering the last question submits the form immediately. Clicking the
    // leftover OK button of the (hidden but still mounted) final question
    // would navigate back and raise a spurious validation error.
    if (await this.isEndingScreenVisible()) {
      return;
    }

    // Prefer Enter once focus is on the question — Typeform handles it well.
    // Still click the focused OK as a fallback (needed when nothing is selected
    // and we are asserting a validation error).
    await this.page.keyboard.press('Enter');
    await this.waitForScrollToSettle();

    if (await this.isEndingScreenVisible()) {
      return;
    }

    const okInFocused = this.focusedBlock().locator(this.okButton);
    try {
      const button = await this.firstInViewport(okInFocused, 3000);
      await button.click();
      await this.waitForScrollToSettle();
    } catch {
      console.log('No OK button on the focused question; assuming the form already advanced.');
    }
  }

  /**
   * Click the back navigation button
   */
  async clickBackButton() {
    const button = this.page.locator(this.backButton).first();
    await button.waitFor({ state: 'visible', timeout: 5000 });
    const isDisabled = await button.isDisabled();
    if (!isDisabled) {
      await button.click();
      await this.waitForScrollToSettle();
    }
  }

  /**
   * Click the forward navigation button
   */
  async clickForwardButton() {
    const button = this.page.locator(this.forwardButton).first();
    await button.waitFor({ state: 'visible', timeout: 5000 });
    const isDisabled = await button.isDisabled();
    if (!isDisabled) {
      await button.click();
      await this.waitForScrollToSettle();
    }
  }

  /**
   * Locator matching Typeform validation messages ("Please fill in ...",
   * "Oops! Please make a selection", etc.) plus generic error containers.
   */
  errorMessageLocator() {
    return this.page
      .locator('[data-qa*="error"], [role="alert"]')
      .or(this.page.getByText(/please fill|please make a selection|please select|required/i));
  }

  /**
   * Check if an error message is visible in the current viewport
   */
  async isErrorMessageVisible() {
    // The ending screen keeps answered questions mounted at in-viewport
    // coordinates (hidden via opacity), so ignore anything found there.
    if (await this.isEndingScreenVisible()) {
      return false;
    }
    try {
      await this.firstInViewport(this.errorMessageLocator(), 3000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get error message text
   */
  async getErrorMessage() {
    try {
      const element = await this.firstInViewport(this.errorMessageLocator(), 3000);
      const text = await element.textContent();
      return text ? text.trim() : '';
    } catch {
      return '';
    }
  }

  /**
   * Check if success/confirmation page is visible
   */
  async isSuccessPageVisible() {
    // Only the real ending screen counts — matching loose text anywhere in
    // the body false-positives because all questions stay mounted in the DOM.
    return await this.isOnEndingScreen();
  }

  /**
   * Get success/confirmation message
   */
  async getSuccessMessage() {
    try {
      const heading = this.page.locator('h1, h2, [role="heading"]').first();
      const message = await heading.textContent({ timeout: 2000 });
      if (message && message.trim()) return message.trim();
    } catch {
      // Ending screens render plain paragraphs without headings; fall through.
    }
    const bodyText = await this.getQuestionAreaText();
    const match = bodyText.match(/[^.!?]*(thank you|submitted|success|completion|entered)[^.!?]*[.!?]?/i);
    return match ? match[0].trim() : '';
  }

  /**
   * Get current page URL
   */
  async getCurrentUrl() {
    return this.page.url();
  }

  /**
   * Check if on a question with specific text
   */
  async isOnQuestion(questionText) {
    try {
      const currentQuestion = await this.getCurrentQuestion();
      return currentQuestion.toLowerCase().includes(questionText.toLowerCase());
    } catch {
      return false;
    }
  }

  /**
   * Get all visible text on the current question
   */
  async getQuestionAreaText() {
    const text = await this.page.locator('body').textContent();
    return text ? text.trim() : '';
  }

  /**
   * Instant check for the ending (thank you / decline) screen.
   * The last question block can stay flagged as focused, but on endings it is
   * scrolled out of the viewport / replaced by the thank-you marker.
   */
  async isEndingScreenVisible() {
    return await this.page.locator('[data-qa*="thank-you-screen-visible"]').count() > 0;
  }

  /**
   * Like isEndingScreenVisible, but waits for the submit round-trip to finish.
   */
  async isOnEndingScreen() {
    const ending = this.page.locator('[data-qa*="thank-you-screen-visible"]');
    try {
      await ending.first().waitFor({ state: 'visible', timeout: 8000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for form to be fully loaded and interactive
   */
  async waitForFormReady() {
    // Prefer a real readiness signal over a fixed sleep.
    const ready = this.page.locator(`${this.textInput}, ${this.startButton}, [data-qa-block="true"]`).first();
    await ready.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await this.waitForScrollToSettle();
  }

  /**
   * Check if input field is visible and enabled
   */
  async isInputFieldVisible() {
    const input = this.page.locator(this.textInput).first();
    try {
      return await input.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get number of visible checkboxes (for multiple selections)
   */
  async getVisibleCheckboxCount() {
    const checkboxes = this.page.locator(this.checkboxInput);
    return await checkboxes.count();
  }

  /**
   * Get all visible radio button options
   */
  async getVisibleRadioOptions() {
    const radios = this.page.locator(this.radioInput);
    const count = await radios.count();
    const options = [];

    for (let i = 0; i < count; i++) {
      const radio = radios.nth(i);
      const parent = radio.locator('xpath=ancestor::*[contains(@class, "radio") or contains(@class, "option") or @role="radio"]');
      const text = await parent.textContent().catch(() => '');
      if (text) {
        options.push(text.trim());
      }
    }
    return options;
  }
}

module.exports = { TypeformPage };
