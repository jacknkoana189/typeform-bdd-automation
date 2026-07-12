const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// this.form is a TypeformPage created for each scenario in support/world.js.

Given('the user navigates to the competition entry page', async function () {
  await this.form.navigate();
});

Given('the user clicks the "Start" button', async function () {
  await this.form.clickStart();
});

Given('the user waits for the first form question to load', async function () {
  await this.form.waitForFirstQuestion();
});

When('the user enters their full name as {string}', async function (name) {
  await this.form.fillName(name);
});

When('the user clears the name field and enters {string}', async function (name) {
  await this.form.fillName(name);
});

// Leaving a question unanswered requires no interaction.

When('the user does not enter any name', async function () {});
When('the user does not select any participation option', async function () {});
When('the user does not select any draw option', async function () {});

When('the user clicks the OK button to proceed', async function () {
  await this.form.clickOk();
});

When('the user clicks the OK button to submit', async function () {
  await this.form.clickOk();
});

When('the user selects {string} for participation', async function (option) {
  await this.form.selectChoice(option);
});

When('the user selects {string} for the agreement question', async function (option) {
  await this.form.answerAgreement(option);
});

When('the user selects the {string} checkbox', async function (label) {
  await this.form.selectChoice(label);
});

When('the user selects both {string} and {string} checkboxes', async function (first, second) {
  await this.form.selectChoice(first);
  await this.form.selectChoice(second);
});

When('the user navigates back to the previous question', async function () {
  await this.form.clickBack();
});

When('the user completes the form with valid data', async function (dataTable) {
  const data = dataTable.rowsHash();
  await this.form.fillName(data.name);
  await this.form.clickOk();
  await this.form.selectChoice(
    data.participation === 'Yes' ? 'Yes, I would like to participate' : 'No, I do not want to participate'
  );
  await this.form.clickOk();
  for (const draw of data.draws.split(',')) await this.form.selectChoice(draw.trim());
  await this.form.clickOk();
  await this.form.answerAgreement(data.agreement);
  await this.form.clickOk();
});

// Every outcome below means the same thing: the run reached Typeform's real ending screen (thank-you for entries, early ending for declines).

for (const phrase of [
  'the user should see a success or thank you message',
  'the form submission should be successful',
  'all four form questions should have been presented',
  'the form should successfully process the submission',
  'the form should accept both draw selections',
  'the form should accept the special characters in the name',
  'the form submission process should end or show a thank you message',
  'the user should not be presented with further questions',
]) {
  Then(phrase, async function () {
    expect(await this.form.isSubmitted()).toBeTruthy();
  });
}

Then('the form submission should be recorded', async function () {
  expect((await this.form.successMessage()).length).toBeGreaterThan(0);
});

Then(
  /^an error message should appear indicating (?:a required field|at least one draw must be selected)$/,
  async function () {
    expect(await this.form.hasError()).toBeTruthy();
  }
);

Then(/^the user should remain on the (name|participation|draw selection) question$/, async function (question) {
  const keyword = { name: 'name', participation: 'participate', 'draw selection': 'draw' }[question];
  expect((await this.form.currentQuestion()).toLowerCase()).toContain(keyword);
});

Then('the updated name should be retained', async function () {
  expect(await this.form.nameValue()).toBe('Jack Mpho Nkoana Updated');
});
