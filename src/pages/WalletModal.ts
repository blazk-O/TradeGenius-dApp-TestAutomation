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

const WALLET_OPTION_PIERCE_SELECTORS = (name: string): ReadonlyArray<string> => [
  `pierce/wui-list-wallet[name="${name}" i]`,
  `pierce/[data-testid="wallet-selector-${name.toLowerCase()}"]`,
  `pierce/button:has-text("${name}")`,
  `pierce/[role="button"]:has-text("${name}")`,
  `pierce/text=${name}`,
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
    for (const selector of MODAL_HOST_SELECTORS) {
      const locator = this.page.locator(selector).first();
      if (await super.isVisible(locator, 1_000)) return true;
    }
    return false;
  }

  async selectMetaMask(): Promise<void> {
    await this.selectWalletByName('MetaMask');
  }

  async selectWalletByName(name: string): Promise<void> {
    const selectors = WALLET_OPTION_PIERCE_SELECTORS(name);
    for (const selector of selectors) {
      const locator = this.page.locator(selector).first();
      try {
        await locator.waitFor({ state: 'visible', timeout: 2_000 });
        await locator.click({ timeout: defaultTimeouts.uiElement });
        return;
      } catch {
        // try next selector
      }
    }
    throw new Error(`Wallet "${name}" not found in modal. Tried ${selectors.length} selectors.`);
  }

  async dismiss(): Promise<void> {
    const closeSelectors: ReadonlyArray<string> = [
      'pierce/[aria-label="Close" i]',
      'pierce/button:has-text("Close")',
      'pierce/[data-testid="modal-close"]',
      'pierce/wui-icon-box[name="close"]',
    ];
    for (const selector of closeSelectors) {
      const locator = this.page.locator(selector).first();
      try {
        await locator.waitFor({ state: 'visible', timeout: 1_500 });
        await locator.click({ timeout: defaultTimeouts.uiElement });
        return;
      } catch {
        // try next
      }
    }
    await this.page.keyboard.press('Escape');
  }

  async listAvailableWalletNames(): Promise<ReadonlyArray<string>> {
    const handles = await this.page
      .locator('pierce/wui-list-wallet, pierce/[data-testid^="wallet-selector-"]')
      .all();
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
}
