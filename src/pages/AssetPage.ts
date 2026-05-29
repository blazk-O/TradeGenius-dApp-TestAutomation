import { Locator, Page } from 'playwright';
import { BasePage } from './BasePage';
import { env } from '../config/env';
import { defaultTimeouts } from '../config/playwright.config';

const CONNECT_BUTTON_SELECTORS: ReadonlyArray<string> = [
  'button:has-text("Connect Wallet")',
  'button:has-text("Connect")',
  '[data-testid="connect-wallet"]',
  '[data-testid="connect-button"]',
  'button:has-text("Sign in")',
  'button:has-text("Login")',
  'w3m-button',
  'appkit-button',
];

const ADDRESS_DISPLAY_SELECTORS: ReadonlyArray<string> = [
  '[data-testid="connected-address"]',
  '[data-testid="wallet-address"]',
  'button:has-text("0x")',
  '[class*="address" i]:has-text("0x")',
  '[class*="account" i]:has-text("0x")',
];

const PROFILE_AVATAR_SELECTORS: ReadonlyArray<string> = [
  '[data-testid="profile-avatar"]',
  '[data-testid="user-avatar"]',
  '[class*="avatar" i]',
];

const USERNAME_MODAL_SELECTORS: ReadonlyArray<string> = [
  '[role="dialog"]:has-text("Username"):has-text("You can only choose this once")',
  '[role="dialog"]:has-text("Username"):has-text("Next")',
  'text=You can only choose this once.',
];

const ADDRESS_REGEX = /(0x[a-fA-F0-9]{4,40}(?:\.{2,3}[a-fA-F0-9]{2,8})?)/;

export class AssetPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await super.navigate(env.targetUrl);
    await this.waitForPageReady();
  }

  async waitForPageReady(): Promise<void> {
    await this.waitForNetworkIdle();
    if (await this.isUsernameOnboardingVisible()) return;
    if (await this.isUserLoggedIn()) return;

    const button = await this.findConnectButton({ optional: true });
    if (await this.isVisible(button, defaultTimeouts.uiElement)) {
      await this.waitForVisible(button, defaultTimeouts.uiElement);
    }
  }

  async clickConnectWallet(): Promise<void> {
    const button = await this.findConnectButton();
    await this.safeClick(button);
  }

  async waitForConnectButtonVisible(): Promise<void> {
    const button = await this.findConnectButton();
    await this.waitForVisible(button, defaultTimeouts.uiElement);
  }

  async getWalletButtonText(): Promise<string> {
    const button = await this.findConnectButton();
    return this.getText(button);
  }

  async isUserLoggedIn(): Promise<boolean> {
    for (const selector of ADDRESS_DISPLAY_SELECTORS) {
      const locator = this.page.locator(selector).first();
      if (await this.isVisible(locator, 1_500)) return true;
    }
    for (const selector of PROFILE_AVATAR_SELECTORS) {
      const locator = this.page.locator(selector).first();
      if (await this.isVisible(locator, 1_500)) return true;
    }
    const bodyText = (await this.page.locator('body').textContent()) ?? '';
    return ADDRESS_REGEX.test(bodyText);
  }

  async isUsernameOnboardingVisible(): Promise<boolean> {
    for (const selector of USERNAME_MODAL_SELECTORS) {
      const locator = this.page.locator(selector).first();
      if (await this.isVisible(locator, 1_500)) return true;
    }

    const usernameHeading = this.page.getByText(/^Username$/).first();
    const nextButton = this.page.getByRole('button', { name: /^Next$/ }).first();
    return (
      await this.isVisible(usernameHeading, 1_500) &&
      await this.isVisible(nextButton, 1_500)
    );
  }

  async getConnectedAddress(): Promise<string> {
    for (const selector of ADDRESS_DISPLAY_SELECTORS) {
      const locator = this.page.locator(selector).first();
      if (await this.isVisible(locator, 2_000)) {
        const text = (await locator.textContent())?.trim() ?? '';
        const match = text.match(ADDRESS_REGEX);
        if (match) return match[1];
      }
    }
    const bodyText = (await this.page.locator('body').textContent()) ?? '';
    const match = bodyText.match(ADDRESS_REGEX);
    if (!match) throw new Error('Connected wallet address not found on page');
    return match[1];
  }

  async getConsoleErrors(): Promise<ReadonlyArray<string>> {
    const errors: string[] = [];
    this.page.on('pageerror', (err) => errors.push(String(err)));
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    return errors;
  }

  private async findConnectButton(opts: { optional?: boolean } = {}): Promise<Locator> {
    for (const selector of CONNECT_BUTTON_SELECTORS) {
      const locator = this.page.locator(selector).first();
      if (await this.isVisible(locator, 2_000)) return locator;
    }
    if (opts.optional) {
      return this.page.locator(CONNECT_BUTTON_SELECTORS[0]).first();
    }
    throw new Error(
      `Connect Wallet button not found. Tried: ${CONNECT_BUTTON_SELECTORS.join(', ')}`,
    );
  }
}
