import { Locator, Page } from 'playwright';
import { BasePage } from './BasePage';
import { defaultTimeouts } from '../config/playwright.config';

const MODAL_HOST_SELECTORS: ReadonlyArray<string> = [
  'w3m-modal',
  'wcm-modal',
  'appkit-modal',
  '[data-testid="wallet-modal"]',
  '[role="dialog"]',
];

const VISIBLE_MODAL_SELECTORS: ReadonlyArray<string> = [
  'text=Sign in or create an account',
  'button:has-text("Connect with Wallet")',
  '[role="dialog"]:has-text("Sign in or create an account")',
  '[role="dialog"]:has-text("Connect with Wallet")',
  'w3m-modal:has-text("MetaMask")',
  'wcm-modal:has-text("MetaMask")',
  'appkit-modal:has-text("MetaMask")',
  '[data-testid="wallet-modal"]:has-text("MetaMask")',
];

const WALLET_OPTION_SELECTORS = (name: string): ReadonlyArray<string> => [
  `wui-list-wallet[name="${name}" i]`,
  `[data-testid="wallet-selector-${name.toLowerCase()}"]`,
  `button:has-text("${name}")`,
  `[role="button"]:has-text("${name}")`,
  `text=${name}`,
];

export class WalletModal extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async waitForModal(timeoutMs: number = defaultTimeouts.modalAnimation): Promise<void> {
    const host = await this.findModalHost(timeoutMs);
    await this.waitForVisible(host, timeoutMs);
  }

  async isVisible(): Promise<boolean> {
    for (const selector of VISIBLE_MODAL_SELECTORS) {
      const locator = this.page.locator(selector).first();
      if (await super.isVisible(locator, 1_000)) return true;
    }
    return false;
  }

  async selectMetaMask(): Promise<void> {
    await this.selectWalletByName('MetaMask');
  }

  async selectWalletByName(name: string): Promise<void> {
    if (await this.tryClickWalletOption(name)) return;
    await this.openWalletProviderList();
    if (await this.tryClickWalletOption(name)) return;

    const selectors = WALLET_OPTION_SELECTORS(name);
    throw new Error(`Wallet "${name}" not found in modal. Tried ${selectors.length} selectors.`);
  }

  async dismiss(): Promise<void> {
    const closeSelectors: ReadonlyArray<string> = [
      '[aria-label="Close" i]',
      'button:has-text("Close")',
      '[data-testid="modal-close"]',
      'wui-icon-box[name="close"]',
    ];
    for (const selector of closeSelectors) {
      const locator = this.page.locator(selector).first();
      try {
        await locator.waitFor({ state: 'visible', timeout: 1_500 });
        await locator.click({ timeout: defaultTimeouts.uiElement });
        await this.waitForModalToClose();
        return;
      } catch {
        // try next
      }
    }
    await this.page.keyboard.press('Escape');
    await this.waitForModalToClose();
  }

  async listAvailableWalletNames(): Promise<ReadonlyArray<string>> {
    const handles = [
      ...(await this.page.locator('wui-list-wallet').all()),
      ...(await this.page.locator('[data-testid^="wallet-selector-"]').all()),
      ...(await this.page.locator('button, [role="button"]').all()),
    ];
    const names: string[] = [];
    for (const handle of handles) {
      const attr = await handle.getAttribute('name');
      if (attr) names.push(attr);
      else {
        const text = (await handle.textContent())?.trim();
        if (text) names.push(text);
      }
    }
    return names;
  }

  private async findModalHost(timeoutMs: number): Promise<Locator> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      for (const selector of VISIBLE_MODAL_SELECTORS) {
        const locator = this.page.locator(selector).first();
        if (await super.isVisible(locator, 500)) return locator;
      }
      for (const selector of MODAL_HOST_SELECTORS) {
        const locator = this.page.locator(selector).first();
        if (await super.isVisible(locator, 500)) return locator;
      }
      await this.page.waitForTimeout(200);
    }
    throw new Error(
      `Wallet selection modal not detected. Tried: ${MODAL_HOST_SELECTORS.join(', ')}`,
    );
  }

  private async tryClickWalletOption(name: string): Promise<boolean> {
    for (const selector of WALLET_OPTION_SELECTORS(name)) {
      const locator = this.page.locator(selector).first();
      try {
        await locator.waitFor({ state: 'visible', timeout: 2_000 });
        await locator.click({ timeout: defaultTimeouts.uiElement });
        return true;
      } catch {
        // try next selector
      }
    }
    return false;
  }

  private async openWalletProviderList(): Promise<void> {
    const openWalletSelectors: ReadonlyArray<string> = [
      'button:has-text("Connect with Wallet")',
      '[role="button"]:has-text("Connect with Wallet")',
      'button:has-text("Continue with Wallet")',
      '[role="button"]:has-text("Continue with Wallet")',
    ];
    for (const selector of openWalletSelectors) {
      const locator = this.page.locator(selector).first();
      if (await super.isVisible(locator, 2_000)) {
        await locator.click({ timeout: defaultTimeouts.uiElement });
        await this.page.waitForTimeout(1_000);
        return;
      }
    }
  }

  private async waitForModalToClose(timeoutMs = defaultTimeouts.modalAnimation): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!(await this.isVisible())) return;
      await this.page.waitForTimeout(200);
    }
  }
}
