Feature: Lucky World Cup 2026 FIFA Competition Entry Form
  As an employee
  I want to complete the World Cup competition entry form
  So that I can participate in the Team Draw and/or Player Draw for a chance to win prizes

  Background:
    Given the user navigates to the competition entry page
    And the user clicks the "Start" button
    And the user waits for the first form question to load

  Scenario: Happy path - User successfully completes and submits the entire form
    When the user enters their full name as "Jack Mpho Nkoana"
    And the user clicks the OK button to proceed
    And the user selects "Yes, I would like to participate" for participation
    And the user clicks the OK button to proceed
    And the user selects the "Team Draw" checkbox
    And the user selects the "Player Draw" checkbox
    And the user clicks the OK button to proceed
    And the user selects "Yes" for the agreement question
    And the user clicks the OK button to submit
    Then the user should see a success or thank you message
    And the form submission should be recorded

  Scenario: Required field validation - Name field cannot be empty
    When the user does not enter any name
    And the user clicks the OK button to proceed
    Then an error message should appear indicating a required field
    And the user should remain on the name question

  Scenario: Required field validation - Participation question must be answered
    When the user enters their full name as "Jack Mpho Nkoana"
    And the user clicks the OK button to proceed
    And the user does not select any participation option
    And the user clicks the OK button to proceed
    Then an error message should appear indicating a required field
    And the user should remain on the participation question

  Scenario: Required field validation - Draw selection must be made
    When the user enters their full name as "Jack Mpho Nkoana"
    And the user clicks the OK button to proceed
    And the user selects "Yes, I would like to participate" for participation
    And the user clicks the OK button to proceed
    And the user does not select any draw option
    And the user clicks the OK button to proceed
    Then an error message should appear indicating at least one draw must be selected
    And the user should remain on the draw selection question

  Scenario: Agreement declined - Selecting "No" ends the form without an entry
    When the user enters their full name as "Jack Mpho Nkoana"
    And the user clicks the OK button to proceed
    And the user selects "Yes, I would like to participate" for participation
    And the user clicks the OK button to proceed
    And the user selects the "Team Draw" checkbox
    And the user clicks the OK button to proceed
    And the user selects "No" for the agreement question
    And the user clicks the OK button to submit
    Then the form submission process should end or show a thank you message
    And the user should not be presented with further questions

  Scenario: Multi-step navigation - User can go back and change previous answer
    When the user enters their full name as "Jack Mpho Nkoana"
    And the user clicks the OK button to proceed
    And the user selects "Yes, I would like to participate" for participation
    And the user clicks the OK button to proceed
    And the user navigates back to the previous question
    And the user navigates back to the previous question
    And the user clears the name field and enters "Jack Mpho Nkoana Updated"
    Then the updated name should be retained
    When the user clicks the OK button to proceed
    And the user selects "Yes, I would like to participate" for participation
    And the user clicks the OK button to proceed
    And the user selects the "Team Draw" checkbox
    And the user clicks the OK button to proceed
    And the user selects "Yes" for the agreement question
    And the user clicks the OK button to submit
    Then the user should see a success or thank you message
    And the form submission should be successful

  Scenario: Typeform renders all questions dynamically
    When the user completes the form with valid data
    | name           | Jack Mpho Nkoana  |
    | participation  | Yes               |
    | draws          | Team Draw         |
    | agreement      | Yes               |
    Then all four form questions should have been presented
    And the form should successfully process the submission

  Scenario: User can select multiple draw options
    When the user enters their full name as "Jack Mpho Nkoana"
    And the user clicks the OK button to proceed
    And the user selects "Yes, I would like to participate" for participation
    And the user clicks the OK button to proceed
    And the user selects both "Team Draw" and "Player Draw" checkboxes
    And the user clicks the OK button to proceed
    And the user selects "Yes" for the agreement question
    And the user clicks the OK button to submit
    Then the form should accept both draw selections
    And the form submission should be successful

  Scenario: Edge case - Name with special characters is accepted
    When the user enters their full name as "José María O'Neill-Smith Jr."
    And the user clicks the OK button to proceed
    And the user selects "Yes, I would like to participate" for participation
    And the user clicks the OK button to proceed
    And the user selects the "Player Draw" checkbox
    And the user clicks the OK button to proceed
    And the user selects "Yes" for the agreement question
    And the user clicks the OK button to submit
    Then the form should accept the special characters in the name
    And the form submission should be successful

  Scenario: User declining participation cannot proceed
    When the user enters their full name as "Jack Mpho Nkoana"
    And the user clicks the OK button to proceed
    And the user selects "No, I do not want to participate" for participation
    And the user clicks the OK button to proceed
    Then the form submission process should end or show a thank you message
    And the user should not be presented with further questions
