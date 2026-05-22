Feature: Web3 Wallet Login on TradeGenius Asset Platform

  Background:
    Given the browser is launched with MetaMask extension installed
    And MetaMask is configured with a test wallet

  Scenario: Successfully connect MetaMask wallet and log in
    Given I navigate to the TradeGenius Asset page
    When I click the "Connect Wallet" button
    Then the wallet selection modal should be visible
    When I select "MetaMask" from the wallet options
    Then the MetaMask connection popup should appear
    When I approve the wallet connection in MetaMask
    Then I should be logged in with my wallet address visible

  Scenario: Wallet modal closes on dismiss
    Given I navigate to the TradeGenius Asset page
    When I click the "Connect Wallet" button
    Then the wallet selection modal should be visible
    When I dismiss the wallet modal
    Then the modal should no longer be visible
    And I should not be logged in
