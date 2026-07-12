# QA Automat*ion Engineer Assessment — Write-Up*

## *Assumptions about the form’s expected behaviour*

*I inspected the live Typeform before locking scenarios. The form has **four questions only**:*

1. ***Full name** — required text*
2. ***Participation** — Yes / No (required)*
3. ***Draw selection** — Team Draw and/or Player Draw (at least one required)*
4. ***Agreement / consent** — Yes / No*

*It does **not** ask for email, phone, date of birth, age confirmation, region, or a World Cup prediction. The brief’s examples (email/phone/DOB, age-gating) were treated as “where applicable,” not as a fixed field list.*

*Behavioural assumptions coded into the suite:*

- *Empty required answers show a validation message and keep the user on that question.*
- *Selecting **No** for participation ends the journey (ending / thank-you style screen) instead of continuing to draws.*
- *Selecting **No** for agreement likewise ends without a successful competition entry.*
- *Typeform preserves previously entered answers when navigating backward.*
- *Successful completion surfaces a thank-you / confirmation ending screen.*



## Why input-format scenarios were not applicable

The brief asks for invalid-format coverage where the form collects typed values with formats (malformed email, invalid phone, out-of-range DOB).

**Those controls are absent on this live form.** Writing scenarios for fields that do not exist would either:

- fail for the wrong reason (element not found), or
- invent behaviour the product does not have.

So format validation was marked **N/A**, and effort went into what the form actually does:

- required-field checks for name, participation, and draws
- a special-character name edge case (the only free-text input)
- consent / participation branching as the real eligibility-style logic



## What I would add or change with more time

1. Stronger confirmation assertions once ending-screen copy/URL is stable.
2. Fewer residual short polls — wait only on Typeform focused-block / motion signals.
3. Tagged smoke vs full suite, plus Firefox/WebKit.
4. CI that installs Chromium, runs `npm run test:report`, and uploads the HTML report (with screenshots).
5. Network mocking for offline CI while keeping a small live smoke set.
6. Keyboard-only accessibility progression through the four questions.
7. If the form later gained email/phone/DOB fields, add dedicated invalid-format scenarios then.



## Trickiest part of automating this flow

Typeform keeps **previous questions mounted in the DOM** and scrolls between them with animation. Naive locators match hidden/stale OK buttons and choice controls; clicks during scroll are often ignored. Short labels like `"Yes"` also match an earlier participation answer still in the DOM.

How I solved it:

- Scope interactions to the **focused** question block (`[data-qa-block][data-qa-focused]`).
- Prefer elements that are **actually in the viewport**.
- **Wait for scroll to settle** before clicking.
- For Yes/No, read the letter key from the focused label and press it, then verify `aria-checked`.
- Treat ending screens via the thank-you `data-qa` marker so leftover controls are not clicked after submit.



## Coverage mapping to the brief


| Brief requirement           | Covered? | How                                                                     |
| --------------------------- | -------- | ----------------------------------------------------------------------- |
| Happy path + confirmation   | Yes      | Full 4-question submit                                                  |
| Required field validation   | Yes      | Name, participation, draws                                              |
| Input format validation     | **N/A**  | No email/phone/DOB on live form; special-character name covered instead |
| Multi-step back navigation  | Yes      | Edit name, finish remaining questions, submit                           |
| Eligibility / consent logic | Yes      | Decline participation; decline agreement                                |
| Dynamic Typeform rendering  | Yes      | Focused-block waits + scroll settle + data-table flow                   |
| Page objects + DRY steps    | Yes      | `pages/`, `step_definitions/`, shared helpers                           |
| README + report             | Yes      | `README.md`, HTML/JSON report with screenshots                          |




## Stack choice

**Cucumber.js + Playwright + JavaScript** — Gherkin for readable scenarios, Playwright for reliable waits against a dynamic widget, and plain JS so reviewers can clone and run with no TypeScript build step.