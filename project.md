# Project overview

Reference material for anyone who wants to understand the structure before
reading the code. Running the tests only needs the two commands in the README.

## Layout

```
typeform-bdd-automation/
├── features/
│   ├── lucky_world_cup_competition.feature  # Gherkin scenarios
│   └── step_definitions/
│       └── typeform.steps.js                # Step implementations
├── pages/
│   └── TypeformPage.js                      # Page object: all Typeform knowledge
├── support/
│   └── world.js                             # Browser lifecycle hooks
├── scripts/
│   └── setup.js                             # npm run setup
├── reports/                                 # HTML + JSON reports + screenshots
├── cucumber.js                              # Cucumber config
├── requirements.md
├── assessment_writeup.md
└── README.md
```

The layering is the usual BDD split: feature files describe behaviour in plain
language, step definitions are one-line glue, and everything that knows how
Typeform actually works lives in the page object. When the form changes, the
fix happens in `TypeformPage.js` and nowhere else.

## The form

The live form has exactly four questions and nothing else:

1. Full name — required text input
2. Participation — Yes / No, required
3. Draw selection — Team Draw and/or Player Draw checkboxes, at least one required
4. Agreement / consent — Yes / No; answering No ends the flow without an entry

## Locator strategy

- Prefer Typeform's `data-qa*` attributes, especially the focused question
  block (`[data-qa-block][data-qa-focused]`) and the thank-you screen marker.
- Fall back to roles and accessible text.
- Only match elements whose centre is actually inside the viewport, because
  Typeform keeps answered questions mounted in the DOM and naive selectors hit
  hidden copies.

## Wait strategy

- No fixed sleeps. Every wait polls a condition and returns as soon as it is
  true; the timeout is only a deadline for giving up.
- Before any interaction, `settle()` waits for the focused question to stop
  moving, because Typeform silently ignores clicks during its slide animation.
- Every action verifies its own effect: typed text is read back from the input,
  choice clicks poll for `aria-checked="true"`, and submission waits for the
  ending screen. A click that did not register fails loudly at the step that
  performed it.

## Running a subset

```bash
npx cucumber-js features/lucky_world_cup_competition.feature --name "Happy path"
```

`--name` matches any part of a scenario title, so pick any distinctive phrase
from the feature file ("special characters", "Multi-step navigation", and so
on).

## Test data

Scenarios use the fixed name `Jack Mpho Nkoana`, plus
`José María O'Neill-Smith Jr.` for the special-character case. Note that every
run submits real entries into the live form; a cloned test form via a
configurable URL is the first improvement listed in the write-up.

## Troubleshooting

- **Playwright browser missing** — run `npm run setup` (or
  `npx playwright install chromium`).
- **Flaky clicks / element not visible** — run headed
  (`HEADLESS=false npm test`) and watch where it sticks; the interaction logic
  is all in `pages/TypeformPage.js`.
- **Typeform unreachable** — confirm you can open the form URL in a normal
  browser; the tests need the live site.
- **Evidence of a run** — open `reports/cucumber_report.html`; every scenario
  embeds a full-page screenshot, pass or fail.
