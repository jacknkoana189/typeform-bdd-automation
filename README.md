Lucky World Cup 2026 - BDD Test Automation

Automated tests for the [https://luckybeardsurvey.typeform.com/to/ZRbAsk1c](https://luckybeardsurvey.typeform.com/to/ZRbAsk1c)

Run the tests

```bash
npm run setup
npm test
```

The setup script checks your Node version, installs dependencies, and downloads
the browser if needed. If something is missing it tells you exactly what.
Details are in [requirements.md](requirements.md) if you ever need them.

To watch the browser while the tests run:

```bash
HEADLESS=false npm test                # bash / macOS / Linux
$env:HEADLESS="false"; npm test        # PowerShell
```

Every run writes an HTML report with a screenshot per scenario to
`reports/cucumber_report.html`.

What the form is and what I tested

The form has four questions: your name, whether you want to participate, which
draws you want to enter (Team Draw and/or Player Draw), and a consent step.
There is no email, phone, or date of birth field, so the invalid-format checks
from the brief were not applicable; my reasoning for that call is in
[assessment_writeup.md](assessment_writeup.md). The suite's 10 scenarios cover
the happy path, required-field validation for each question, consent and
participation branching, back-navigation with an edited answer, multiple draw
selection, and a special-character edge case on the name input.

Approach

Built with Cucumber.js and Playwright in plain JavaScript: Gherkin for readable
scenarios, Playwright for reliable waits, and no TypeScript build step so you
can clone and run immediately. The tricky part of this form is that Typeform
animates between questions and keeps answered ones mounted in the DOM, so the
page object scopes every interaction to the focused question, waits for the
scroll to settle before clicking, and verifies each action actually registered
instead of trusting the click.

More detail on the project structure, locator and wait strategy, and
troubleshooting is in [project.md](project.md). Trade-offs and what I would do
with more time are in [assessment_writeup.md](assessment_writeup.md).