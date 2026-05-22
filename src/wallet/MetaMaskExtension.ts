import { BrowserContext, Page } from 'playwright';
import { env } from '../config/env';
import { defaultTimeouts } from '../config/playwright.config';
import { getMetaMaskExtensionId } from './extensionLoader';

const ONBOARDING_URL_RE = /chrome-extension:\/\/[a-p]{32}\/home\.html#onboarding/;
const HOME_URL_RE = /chrome-extension:\/\/[a-p]{32}\/home\.html/;
const NOTIFICATION_URL_RE = /chrome-extension:\/\/[a-p]{32}\/notification\.html/;

export class MetaMaskExtension {
  private extensionId: string | undefined;

  constructor(
    private readonly context: BrowserContext,
    private readonly seedPhrase: string = env.walletSeedPhrase,
    private readonly password: string = env.walletPassword,
  ) {}

  async getExtensionId(): Promise<string> {
    if (this.extensionId) return this.extensionId;
    this.extensionId = await getMetaMaskExtensionId(this.context);
    return this.extensionId;
  }

  async waitForOnboardingPage(timeoutMs = 30_000): Promise<Page | undefined> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = this.context
        .pages()
        .find((p) => ONBOARDING_URL_RE.test(p.url()) || HOME_URL_RE.test(p.url()));
      if (found) {
        await found.waitForLoadState('domcontentloaded').catch(() => undefined);
        return found;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return undefined;
  }

  async completeOnboarding(): Promise<void> {
    const page = await this.waitForOnboardingPage(45_000);
    if (!page) {
      throw new Error('MetaMask onboarding page did not appear.');
    }

    await page.bringToFront();
    await page.waitForLoadState('domcontentloaded');

    const termsCheckbox = page.locator('[data-testid="onboarding-terms-checkbox"]').first();
    if (await this.locatorVisible(termsCheckbox, 5_000)) {
      await termsCheckbox.click({ timeout: 5_000 }).catch(() => undefined);
    }

    const importButton = page
      .locator('[data-testid="onboarding-import-wallet"], button:has-text("Import an existing wallet")')
      .first();
    if (await this.locatorVisible(importButton, 10_000)) {
      await importButton.click();
    }

    const noThanks = page.locator('button:has-text("No thanks"), [data-testid="metametrics-no-thanks"]').first();
    if (await this.locatorVisible(noThanks, 5_000)) {
      await noThanks.click().catch(() => undefined);
    }

    await this.fillSeedPhrase(page);

    const confirmSrp = page.locator('[data-testid="import-srp-confirm"], button:has-text("Confirm Secret Recovery Phrase")').first();
    if (await this.locatorVisible(confirmSrp, 5_000)) {
      await confirmSrp.click().catch(() => undefined);
    }

    await this.setPassword(page);

    const finishButtons: ReadonlyArray<string> = [
      '[data-testid="onboarding-complete-done"]',
      '[data-testid="pin-extension-next"]',
      '[data-testid="pin-extension-done"]',
      'button:has-text("Done")',
      'button:has-text("Got it")',
      'button:has-text("Next")',
    ];
    for (const sel of finishButtons) {
      const locator = page.locator(sel).first();
      if (await this.locatorVisible(locator, 4_000)) {
        await locator.click({ timeout: 5_000 }).catch(() => undefined);
      }
    }

    await this.dismissPostOnboardingPopups(page);
  }

  async approveConnection(timeoutMs: number = defaultTimeouts.walletPopup): Promise<void> {
    const popup = await this.waitForPopup(timeoutMs);
    await popup.bringToFront();

    const nextLocators: ReadonlyArray<string> = [
      '[data-testid="page-container-footer-next"]',
      'button:has-text("Next")',
    ];
    for (const sel of nextLocators) {
      const locator = popup.locator(sel).first();
      if (await this.locatorVisible(locator, 5_000)) {
        await locator.click({ timeout: 5_000 }).catch(() => undefined);
        break;
      }
    }

    const confirmLocators: ReadonlyArray<string> = [
      '[data-testid="page-container-footer-next"]',
      '[data-testid="confirm-btn"]',
      'button:has-text("Connect")',
      'button:has-text("Confirm")',
    ];
    for (const sel of confirmLocators) {
      const locator = popup.locator(sel).first();
      if (await this.locatorVisible(locator, 5_000)) {
        await locator.click({ timeout: 5_000 }).catch(() => undefined);
        return;
      }
    }
    throw new Error('Could not locate the Connect/Confirm button in MetaMask popup.');
  }

  async signMessage(timeoutMs: number = defaultTimeouts.walletPopup): Promise<void> {
    const popup = await this.waitForPopup(timeoutMs);
    await popup.bringToFront();

    const signButtons: ReadonlyArray<string> = [
      '[data-testid="confirm-footer-button"]',
      '[data-testid="page-container-footer-next"]',
      '[data-testid="signature-confirm-button"]',
      'button:has-text("Sign")',
      'button:has-text("Confirm")',
    ];
    for (const sel of signButtons) {
      const locator = popup.locator(sel).first();
      if (await this.locatorVisible(locator, 5_000)) {
        await locator.click({ timeout: 5_000 });
        return;
      }
    }
    throw new Error('Could not locate the Sign button in MetaMask popup.');
  }

  async getPopupPage(): Promise<Page | undefined> {
    return this.context.pages().find((p) => NOTIFICATION_URL_RE.test(p.url()));
  }

  async waitForPopup(timeoutMs: number = defaultTimeouts.walletPopup): Promise<Page> {
    const existing = await this.getPopupPage();
    if (existing) {
      await existing.waitForLoadState('domcontentloaded').catch(() => undefined);
      return existing;
    }
    const popup = await Promise.race([
      this.context.waitForEvent('page', {
        predicate: (p) => NOTIFICATION_URL_RE.test(p.url()),
        timeout: timeoutMs,
      }),
      new Promise<Page>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out waiting for MetaMask popup')), timeoutMs),
      ),
    ]);
    await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
    return popup;
  }

  async getAddress(): Promise<string> {
    const id = await this.getExtensionId();
    const homePage = await this.context.newPage();
    try {
      await homePage.goto(`chrome-extension://${id}/home.html`, {
        waitUntil: 'domcontentloaded',
      });
      const accountMenu = homePage
        .locator('[data-testid="account-menu-icon"], [data-testid="account-options-menu-button"]')
        .first();
      if (await this.locatorVisible(accountMenu, 8_000)) {
        await accountMenu.click().catch(() => undefined);
      }
      const addressLocator = homePage
        .locator('[data-testid="account-address-text"], [data-testid="address-copy-button-text"]')
        .first();
      await addressLocator.waitFor({ state: 'visible', timeout: 8_000 });
      const raw = (await addressLocator.textContent())?.trim() ?? '';
      const match = raw.match(/0x[a-fA-F0-9]{4,40}/);
      if (!match) throw new Error(`Could not parse address from "${raw}"`);
      return match[0];
    } finally {
      await homePage.close().catch(() => undefined);
    }
  }

  private async fillSeedPhrase(page: Page): Promise<void> {
    const words = this.seedPhrase.trim().split(/\s+/);
    const dropdown = page.locator('[data-testid="import-srp__srp-word-count-dropdown"]').first();
    if (await this.locatorVisible(dropdown, 3_000)) {
      const optionValue = String(words.length);
      await dropdown.selectOption(optionValue).catch(() => undefined);
    }
    for (let i = 0; i < words.length; i++) {
      const wordInput = page.locator(`[data-testid="import-srp__srp-word-${i}"]`).first();
      if (await this.locatorVisible(wordInput, 5_000)) {
        await wordInput.fill(words[i]);
        continue;
      }
      const fallback = page.locator('input[type="password"], textarea').nth(i);
      if (await this.locatorVisible(fallback, 2_000)) {
        await fallback.fill(words[i]);
      }
    }
    const importConfirm = page
      .locator('[data-testid="import-srp-confirm"], button:has-text("Confirm")')
      .first();
    if (await this.locatorVisible(importConfirm, 5_000)) {
      await importConfirm.click().catch(() => undefined);
    }
  }

  private async setPassword(page: Page): Promise<void> {
    const passwordInputs: ReadonlyArray<string> = [
      '[data-testid="create-password-new"]',
      '[data-testid="create-password-new-input"]',
      'input[autocomplete="new-password"]',
    ];
    const confirmInputs: ReadonlyArray<string> = [
      '[data-testid="create-password-confirm"]',
      '[data-testid="create-password-confirm-input"]',
      'input[autocomplete="new-password"]',
    ];
    for (const sel of passwordInputs) {
      const locator = page.locator(sel).first();
      if (await this.locatorVisible(locator, 5_000)) {
        await locator.fill(this.password);
        break;
      }
    }
    for (const sel of confirmInputs) {
      const locator = page.locator(sel).nth(sel === 'input[autocomplete="new-password"]' ? 1 : 0);
      if (await this.locatorVisible(locator, 5_000)) {
        await locator.fill(this.password);
        break;
      }
    }
    const terms = page.locator('[data-testid="create-password-terms"]').first();
    if (await this.locatorVisible(terms, 3_000)) {
      await terms.click().catch(() => undefined);
    }
    const submit = page
      .locator('[data-testid="create-password-import"], [data-testid="create-password-wallet"], button:has-text("Import my wallet")')
      .first();
    if (await this.locatorVisible(submit, 5_000)) {
      await submit.click();
    }
  }

  private async dismissPostOnboardingPopups(page: Page): Promise<void> {
    const dismissables: ReadonlyArray<string> = [
      '[data-testid="popover-close"]',
      '[data-testid="not-now-button"]',
      'button:has-text("Not now")',
      'button:has-text("Got it")',
      'button:has-text("Close")',
    ];
    for (const sel of dismissables) {
      const locator = page.locator(sel).first();
      if (await this.locatorVisible(locator, 2_000)) {
        await locator.click().catch(() => undefined);
      }
    }
  }

  private async locatorVisible(
    locator: ReturnType<Page['locator']>,
    timeoutMs: number,
  ): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }
}
