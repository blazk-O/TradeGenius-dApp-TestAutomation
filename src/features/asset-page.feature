Feature: TradeGenius Asset Page Smoke Tests

  Scenario: Asset page loads correctly
    Given I navigate to the TradeGenius Asset page
    Then the page title should contain "TradeGenius"
    And the "Connect Wallet" button should be visible
    And the page should not display any console errors

  Scenario: Connect Wallet button is interactive
    Given I navigate to the TradeGenius Asset page
    When I click the "Connect Wallet" button
    Then the wallet selection modal should be visible
    And at least one wallet provider option should be displayed
