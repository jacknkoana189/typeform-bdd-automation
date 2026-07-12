const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { TypeformPage } = require('../../pages/TypeformPage');

//Step File//

Given('the user navigates to the competition entry page', async function () {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.navigate();
  await typeformPage.waitForFormReady();
});

Given('the user clicks the "Start" button', async function () {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.clickStartButton();
});

Given('the user waits for the first form question to load', async function () {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.waitForFirstQuestion();
});

//Entering Data//

When('the user enters their full name as {string}', async function (name) {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.fillNameField(name);
});

When('the user does not enter any name', async function () {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.waitForFormReady();
});

When('the user clears the name field and enters {string}', async function (newName) {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.clearNameField();
  await typeformPage.fillNameField(newName);
});

//Button Clicks//

When('the user clicks the OK button to proceed', async function () {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.clickOkButton();
});

When('the user clicks the OK button to submit', async function () {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.clickOkButton();
  await typeformPage.waitForFormReady();
});

//Radio Selection//

When('the user selects {string} for participation', async function (option) {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.selectRadioByText(option);
});

When('the user selects {string} for the agreement question', async function (option) {
  const typeformPage = new TypeformPage(this.page);
  // The form renders the agreement as consecutive identical blocks;
  // this answers each of them until the form moves on.
  await typeformPage.answerAgreementQuestions(option);
});

When('the user does not select any participation option', async function () {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.waitForFormReady();
});

//Checkbox Selection//

When('the user selects the {string} checkbox', async function (checkboxText) {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.selectCheckboxByText(checkboxText);
});

When('the user selects both {string} and {string} checkboxes', async function (checkbox1, checkbox2) {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.selectCheckboxByText(checkbox1);
  await typeformPage.selectCheckboxByText(checkbox2);
});

When('the user does not select any draw option', async function () {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.waitForFormReady();
});

//Navigation//

When('the user navigates back to the previous question', async function () {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.clickBackButton();
});

When('the user navigates forward', async function () {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.clickForwardButton();
});

When('the user navigates back to the first question', async function () {
  const typeformPage = new TypeformPage(this.page);
  for (let i = 0; i < 5; i++) {
    try {
      await typeformPage.clickBackButton();
      await typeformPage.waitForFormReady();
    } catch {
      break;
    }
  }
});

// Complex Scenarios//

When('the user completes the form with valid data', async function (dataTable) {
  const typeformPage = new TypeformPage(this.page);
  const data = dataTable.rowsHash();

  // Fill name//  
  if (data.name) {
    await typeformPage.fillNameField(data.name);
    await typeformPage.clickOkButton();
  }

  // Fill participation//

  if (data.participation) {
    await typeformPage.selectRadioByText(data.participation === 'Yes' ? 'Yes, I would like to participate' : 'No, I do not want to participate');
    await typeformPage.clickOkButton();
  }

  // Select draws//

  if (data.draws) {
    const draws = data.draws.split(',').map(d => d.trim());
    for (const draw of draws) {
      if (draw === 'Team Draw') {
        await typeformPage.selectCheckboxByText('Team Draw');
      } else if (draw === 'Player Draw') {
        await typeformPage.selectCheckboxByText('Player Draw');
      }
    }
    await typeformPage.clickOkButton();
  }

  // Agreement//
  if (data.agreement) {
    await typeformPage.answerAgreementQuestions(data.agreement === 'Yes' ? 'Yes' : 'No');
    await typeformPage.clickOkButton();
  }
});

//  Steps - Validations //

Then('the user should see a success or thank you message', async function () {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.waitForFormReady();
  const isSuccess = await typeformPage.isSuccessPageVisible();
  expect(isSuccess).toBeTruthy();
});

Then('the form submission should be recorded', async function () {
  const typeformPage = new TypeformPage(this.page);
  const message = await typeformPage.getSuccessMessage();
  expect(message.length).toBeGreaterThan(0);
});

Then('the form submission should be successful', async function () {
  const typeformPage = new TypeformPage(this.page);
  const isSuccess = await typeformPage.isSuccessPageVisible();
  expect(isSuccess).toBeTruthy();
});

Then('an error message should appear indicating a required field', async function () {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.waitForFormReady();
  const hasError = await typeformPage.isErrorMessageVisible();
  expect(hasError).toBeTruthy();
});

Then('an error message should appear indicating at least one draw must be selected', async function () {
  const typeformPage = new TypeformPage(this.page);
  await typeformPage.waitForFormReady();
  const hasError = await typeformPage.isErrorMessageVisible();
  expect(hasError).toBeTruthy();
});

Then('the user should remain on the name question', async function () {
  const typeformPage = new TypeformPage(this.page);
  const question = await typeformPage.getCurrentQuestion();
  expect(question.toLowerCase()).toContain('name');
});

Then('the user should remain on the participation question', async function () {
  const typeformPage = new TypeformPage(this.page);
  const question = await typeformPage.getCurrentQuestion();
  expect(question.toLowerCase()).toContain('participate');
});

Then('the user should remain on the draw selection question', async function () {
  const typeformPage = new TypeformPage(this.page);
  const question = await typeformPage.getCurrentQuestion();
  expect(question.toLowerCase()).toContain('draw');
});

Then('the updated name should be retained', async function () {
  const typeformPage = new TypeformPage(this.page);
  const nameValue = await typeformPage.getNameInputValue();
  expect(nameValue).toBe('Jack Mpho Nkoana Updated');
});

Then('the user should proceed through the form', async function () {
  const typeformPage = new TypeformPage(this.page);
  const question = await typeformPage.getCurrentQuestion();
  expect(question.length).toBeGreaterThan(0);
});

Then('all four form questions should have been presented', async function () {
  const typeformPage = new TypeformPage(this.page);
  const isSuccess = await typeformPage.isSuccessPageVisible();
  expect(isSuccess).toBeTruthy();
});

Then('the form should successfully process the submission', async function () {
  const typeformPage = new TypeformPage(this.page);
  const isSuccess = await typeformPage.isSuccessPageVisible();
  expect(isSuccess).toBeTruthy();
});

Then('the form should accept both draw selections', async function () {
  const typeformPage = new TypeformPage(this.page);
  // Reaching the ending/confirmation screen means both draws were accepted.
  const isSuccess = (await typeformPage.isOnEndingScreen()) || (await typeformPage.isSuccessPageVisible());
  expect(isSuccess).toBeTruthy();
});

Then('the form should accept the special characters in the name', async function () {
  const typeformPage = new TypeformPage(this.page);

  // Accepted = completed, a rejected name would block submission//

  const isSuccess = (await typeformPage.isOnEndingScreen()) || (await typeformPage.isSuccessPageVisible());
  expect(isSuccess).toBeTruthy();
});

Then('the form submission process should end or show a thank you message', async function () {
  const typeformPage = new TypeformPage(this.page);
  const isEndState = await typeformPage.isOnEndingScreen();
  expect(isEndState).toBeTruthy();
});

Then('the user should not be presented with further questions', async function () {
  const typeformPage = new TypeformPage(this.page);
  const isEndState = await typeformPage.isOnEndingScreen();
  expect(isEndState).toBeTruthy();
});
