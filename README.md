# Lucky World Cup 2026 - BDD Test Automation Suite

BDD automation for the Lucky Beard Survey Typeform competition entry page:
[[https://luckybeardsurvey.typeform.com/to/ZRbAsk1c]](https://luckybeardsurvey.typeform.com/to/ZRbAsk1c])

## Stack

- **Cucumber.js** (Gherkin / BDD)
- **Playwright** (browser automation)
- **JavaScript** (Node.js)

## Project Structure

```
typeform-bdd-automation/
├── features/
│   ├── lucky_world_cup_competition.feature  # Gherkin scenarios
│   └── step_definitions/
│       └── typeform.steps.js                # Step implementations
├── pages/
│   └── TypeformPage.js                      # Page Object Model
├── support/
│   └── world.js                             # Browser lifecycle hooks
├── reports/                                 # HTML + JSON reports + screenshots
├── cucumber.js                              # Cucumber config
├── package.json
├── README.md
└── ASSESSMENT_WRITEUP.md                    # Assessment write-up
```



## Setup



### Prerequisites

- Node.js 18+ and npm
- Internet access (tests hit the live Typeform)



### Install

```bash
cd typeform-bdd-automation
npm install
npx playwright install chromium
```



## Running Tests



### When you want to run all the scenarios

This runs **every scenario** in the feature file (all 10 stories), one after another, in a hidden browser:

```bash
npm test
```



### Other useful commands

```bash
# All scenarios + HTML / JSON reports
npm run test:report

# All scenarios, but watch the browser (PowerShell) — window stays open after the run; Ctrl+C to exit
$env:HEADLESS="false"; npm test

# All scenarios, but watch the browser (bash/macOS/Linux)
HEADLESS=false npm test

# One scenario only — pick any of these:
npx cucumber-js features/lucky_world_cup_competition.feature --name "Happy path"
npx cucumber-js features/lucky_world_cup_competition.feature --name "Name field cannot be empty"
npx cucumber-js features/lucky_world_cup_competition.feature --name "Participation question must be answered"
npx cucumber-js features/lucky_world_cup_competition.feature --name "Draw selection must be made"
npx cucumber-js features/lucky_world_cup_competition.feature --name "Agreement declined"
npx cucumber-js features/lucky_world_cup_competition.feature --name "Multi-step navigation"
npx cucumber-js features/lucky_world_cup_competition.feature --name "renders all questions dynamically"
npx cucumber-js features/lucky_world_cup_competition.feature --name "multiple draw options"
npx cucumber-js features/lucky_world_cup_competition.feature --name "special characters"
npx cucumber-js features/lucky_world_cup_competition.feature --name "declining participation"
```

Reports are written to:

- `reports/cucumber_report.html` — embedded screenshot per scenario
- `reports/cucumber_report.json`
- `reports/screenshots/` — PNG for every scenario (pass and fail)

On Windows: `start reports/cucumber_report.html`

## Actual Form Structure (live inspection)

The live form has **exactly four questions**. It does **not** collect email, phone, date of birth, age/eligibility gates, region, or a World Cup prediction field.


| #   | Question                        | Control                            | Required              |
| --- | ------------------------------- | ---------------------------------- | --------------------- |
| 1   | Full name                       | Text input                         | Yes                   |
| 2   | Would you like to participate…? | Yes / No                           | Yes                   |
| 3   | Which draw(s)…?                 | Team Draw / Player Draw checkboxes | At least one          |
| 4   | Agreement / consent             | Yes / No                           | Yes (flow ends if No) |


Scenarios and page objects are written against this structure only.

## Coverage (10 scenarios)


| Area                  | What is covered                                          |
| --------------------- | -------------------------------------------------------- |
| Happy path            | All 4 questions with valid data → confirmation           |
| Required fields       | Empty name; unanswered participation; no draw selected   |
| Consent / eligibility | Decline agreement; decline participation                 |
| Multi-step navigation | Go back, change name, finish remaining questions, submit |
| Dynamic rendering     | Data-table driven completion through animated questions  |
| Multiple selection    | Both Team Draw and Player Draw                           |
| Name edge case        | Special characters in the name are accepted              |




### Why there are no email / phone / DOB format scenarios

The assessment brief asks for invalid-format checks **where applicable** (e.g. malformed email, invalid phone, out-of-range DOB).

On this Typeform those fields **are not present**, so inventing email/phone/age tests would not exercise real behaviour. Instead the suite covers:

- **Required-field** validation for every question that exists
- A **name special-character** edge case (closest meaningful “input” check on this form)
- **Consent / participation** branching (the form’s real eligibility-style logic)



## Architecture

- **Feature files** — business-readable Gherkin
- **Step definitions** — reusable Given/When/Then glue
- **Page object** (`TypeformPage`) — locators and Typeform interaction details



### Locator strategy

- Prefer Typeform `data-qa*` attributes and focused question blocks
- Fall back to roles / accessible text
- Prefer viewport-visible matches (Typeform keeps previous questions mounted in the DOM)



### Wait strategy

- Explicit visibility waits and scroll-settling between animated questions
- Poll for choice selection / input values instead of fixed sleeps where practical



## Test Data

 `Jack Mpho Nkoana`

## Troubleshooting


| Issue                             | Fix                                                             |
| --------------------------------- | --------------------------------------------------------------- |
| Playwright browser missing        | `npx playwright install chromium`                               |
| Element not visible / flaky click | `$env:HEADLESS="false"; npm test` and inspect `TypeformPage.js` |
| Typeform unreachable              | Confirm network access to the form URL                          |
| Need evidence of a run            | Open `reports/cucumber_report.html` or `reports/screenshots/`   |


