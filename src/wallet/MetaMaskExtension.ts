import { BrowserContext, Page } from 'playwright';
import { env } from '../config/env';
import { defaultTimeouts } from '../config/playwright.config';
import { getMetaMaskExtensionId } from './extensionLoader';

const ONBOARDING_URL_RE = /chrome-extension:\/\/[a-p]{32}\/home\.html#onboarding/;
const HOME_URL_RE = /chrome-extension:\/\/[a-p]{32}\/home\.html/;
const NOTIFICATION_URL_RE = /chrome-extension:\/\/[a-p]{32}\/notification\.html/;
const ADDRESS_RE = /0x[a-fA-F0-9]{4,40}(?:\.{2,3}[a-fA-F0-9]{2,8})?/;
const PENDING_NOTIFICATION_URL_RE =
  /#(?:connect|confirm|confirmation|signature|permission|transaction|switch|approve|request|account)\b/i;

const NOTIFICATION_ACTION_SELECTORS: ReadonlyArray<string> = [
  '[data-testid="confirm-btn"]',
  '[data-testid="confirmation-submit-button"]',
  '[data-testid="page-container-footer-next"]',
  '[data-testid="signature-confirm-button"]',
  '[data-testid="confirm-footer-button"]',
  '[data-testid="request-signature__sign"]',
  '[data-testid="signature-sign-button"]',
  '[data-testid="signature-warning-sign-button"]',
  '.page-container__footer [data-testid="page-container-footer-next"]',
  '.confirmation-footer__actions button.btn-primary',
  '.request-signature__footer [data-testid="request-signature__sign"]',
  '.signature-request-footer [data-testid="signature-sign-button"]',
  'button:has-text("Connect")',
  'button:has-text("Confirm")',
  'button:has-text("Sign")',
  'button:has-text("Approve")',
  'button:has-text("Switch network")',
  'button:has-text("Switch")',
  'button:has-text("Next")',
];

const NOTIFICATION_IDLE_MS = 30_000;
const NOTIFICATION_HYDRATION_MS = 12_000;

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
    let page = await this.waitForOnboardingPage(45_000);
    if (!page) page = await this.openHomePage();

    await page.bringToFront();
    await page.waitForLoadState('domcontentloaded');

    if (await this.unlockIfNeeded(page)) {
      await this.dismissPostOnboardingPopups(page);
      return;
    }

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
    await this.waitForPopup(timeoutMs);
    await this.drainNotifications(timeoutMs);
  }

  async signMessage(timeoutMs: number = defaultTimeouts.walletPopup): Promise<void> {
    const popup = await this.waitForPopup(timeoutMs, { openIfMissing: false });
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
    return this.getPopupPages()[0];
  }

  async waitForPopup(
    timeoutMs: number = defaultTimeouts.walletPopup,
    opts: { openIfMissing?: boolean } = {},
  ): Promise<Page> {
    const openIfMissing = opts.openIfMissing ?? true;
    const existing = await this.getPopupPage();
    if (existing) {
      await existing.waitForLoadState('domcontentloaded').catch(() => undefined);
      return existing;
    }
    let popup: Page;
    try {
      popup = await this.context.waitForEvent('page', {
        predicate: (p) => NOTIFICATION_URL_RE.test(p.url()),
        timeout: timeoutMs,
      });
    } catch {
      if (!openIfMissing) throw new Error('Timed out waiting for MetaMask popup');
      popup = await this.openNotificationPage();
    }
    await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
    return popup;
  }

  async getAddress(): Promise<string> {
    const homePage = await this.openHomePage();
    try {
      await this.unlockIfNeeded(homePage);

      const accountMenu = homePage
        .locator(
          [
            '[data-testid="account-menu-icon"]',
            '[data-testid="account-options-menu-button"]',
            '[data-testid="account-menu-icon"]',
            '[data-testid="app-header-account-menu-button"]',
          ].join(', '),
        )
        .first();
      if (await this.locatorVisible(accountMenu, 8_000)) {
        await accountMenu.click().catch(() => undefined);
      }

      const addressSelectors: ReadonlyArray<string> = [
        '[data-testid="account-address-text"]',
        '[data-testid="address-copy-button-text"]',
        '[data-testid="app-header-copy-button"]',
        '[data-testid="selected-account-copy"]',
        '[data-testid="account-list-menu-details"]',
        '[class*="address" i]',
      ];
      for (const selector of addressSelectors) {
        const locator = homePage.locator(selector).first();
        if (await this.locatorVisible(locator, 3_000)) {
          const raw = (await locator.textContent())?.trim() ?? '';
          const match = raw.match(ADDRESS_RE);
          if (match) return match[0];
        }
      }

      const bodyText = (await homePage.locator('body').textContent()) ?? '';
      const match = bodyText.match(ADDRESS_RE);
      if (!match) throw new Error(`Could not parse wallet address from MetaMask home. Body text: "${bodyText.slice(0, 500)}"`);
      return match[0];
    } finally {
      await homePage.close().catch(() => undefined);
    }
  }

  private async openHomePage(): Promise<Page> {
    const id = await this.getExtensionId();
    const page = await this.context.newPage();
    await page.goto(`chrome-extension://${id}/home.html`, {
      waitUntil: 'domcontentloaded',
    });
    return page;
  }

  private async openNotificationPage(): Promise<Page> {
    const id = await this.getExtensionId();
    const page = await this.context.newPage();
    await page.goto(`chrome-extension://${id}/notification.html`, {
      waitUntil: 'domcontentloaded',
    });
    return page;
  }

  private getPopupPages(): Page[] {
    return this.context
      .pages()
      .filter((page) => !page.isClosed() && NOTIFICATION_URL_RE.test(page.url()));
  }

  private async drainNotifications(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let clickedCount = 0;
    let lastPendingUrl = '';
    let lastActionAt = Date.now();

    while (Date.now() < deadline) {
      const popup = await this.findOrOpenActionableNotification(
        clickedCount > 0 ? 5_000 : 15_000,
      );
      if (!popup) {
        if (clickedCount > 0 && Date.now() - lastActionAt >= NOTIFICATION_IDLE_MS) return;
        await this.sleep(500);
        continue;
      }

      await this.waitForNotificationHydration(popup, NOTIFICATION_HYDRATION_MS);
      await popup.bringToFront().catch(() => undefined);
      lastPendingUrl = popup.url();

      if (await this.clickNotificationAction(popup)) {
        clickedCount += 1;
        lastActionAt = Date.now();
        if (clickedCount >= 3) return;
        await this.sleep(1_250);
        continue;
      }

      const hasPendingUrl = PENDING_NOTIFICATION_URL_RE.test(popup.url());
      const bodyText = ((await popup.locator('body').textContent().catch(() => '')) ?? '').trim();
      if (clickedCount > 0 && !hasPendingUrl && bodyText === '' && Date.now() - lastActionAt >= NOTIFICATION_IDLE_MS) {
        return;
      }
      await this.sleep(500);
    }

    if (clickedCount === 0) {
      throw new Error('Could not locate an actionable MetaMask notification.');
    }
    throw new Error(`MetaMask notifications did not drain before timeout. Last URL: ${lastPendingUrl}`);
  }

  private async findOrOpenActionableNotification(timeoutMs: number): Promise<Page | undefined> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const active = this.pickActiveNotificationPage();
      if (active) {
        await this.waitForNotificationHydration(active, NOTIFICATION_HYDRATION_MS);
        if (await this.notificationHasAction(active)) return active;
      }

      if (!active) {
        const eventPage = await this.waitForNextNotification(500);
        if (eventPage) {
          await this.waitForNotificationHydration(eventPage, NOTIFICATION_HYDRATION_MS);
          if (await this.notificationHasAction(eventPage)) return eventPage;
        }
      }

      const opened = await this.openNotificationPage().catch(() => undefined);
      if (opened) {
        await this.waitForNotificationHydration(opened, NOTIFICATION_HYDRATION_MS);
        if (await this.notificationHasAction(opened)) return opened;
      }

      await this.sleep(500);
    }
    return undefined;
  }

  private pickActiveNotificationPage(): Page | undefined {
    const pages = this.getPopupPages();
    return pages.find((page) => PENDING_NOTIFICATION_URL_RE.test(page.url())) ?? pages[0];
  }

  private async waitForNextNotification(timeoutMs: number): Promise<Page | undefined> {
    try {
      const popup = await this.context.waitForEvent('page', {
        predicate: (page) => NOTIFICATION_URL_RE.test(page.url()),
        timeout: timeoutMs,
      });
      await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
      return popup;
    } catch {
      return undefined;
    }
  }

  private async clickNotificationAction(page: Page): Promise<boolean> {
    for (const selector of NOTIFICATION_ACTION_SELECTORS) {
      const locator = page.locator(selector).last();
      if (!(await this.locatorVisible(locator, 1_000))) continue;
      if (!(await locator.isEnabled().catch(() => true))) continue;
      await locator.scrollIntoViewIfNeeded().catch(() => undefined);
      await locator
        .click({ timeout: 5_000 })
        .catch(async () => locator.click({ timeout: 5_000, force: true }));
      return true;
    }
    return false;
  }

  private async notificationHasAction(page: Page): Promise<boolean> {
    if (page.isClosed()) return false;
    await this.waitForNotificationHydration(page, 2_000);
    for (const selector of NOTIFICATION_ACTION_SELECTORS) {
      const locator = page.locator(selector).last();
      if (await this.locatorVisible(locator, 500) && await locator.isEnabled().catch(() => true)) {
        return true;
      }
    }
    return false;
  }

  private async waitForNotificationHydration(page: Page, timeoutMs: number): Promise<void> {
    if (page.isClosed()) return;
    const deadline = Date.now() + timeoutMs;
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);

    while (Date.now() < deadline && !page.isClosed()) {
      const bodyText = ((await page.locator('body').textContent().catch(() => '')) ?? '').trim();
      if (bodyText !== '') return;
      if (PENDING_NOTIFICATION_URL_RE.test(page.url())) return;
      for (const selector of NOTIFICATION_ACTION_SELECTORS) {
        const locator = page.locator(selector).last();
        if (await this.locatorVisible(locator, 250) && await locator.isEnabled().catch(() => true)) {
          return;
        }
      }
      await this.sleep(250);
    }
  }

  private async unlockIfNeeded(page: Page): Promise<boolean> {
    const passwordInput = page
      .locator('[data-testid="unlock-password"], input[type="password"]')
      .first();
    if (!(await this.locatorVisible(passwordInput, 3_000))) return false;

    await passwordInput.fill(this.password);
    const unlockButton = page
      .locator('[data-testid="unlock-submit"], button:has-text("Unlock")')
      .first();
    await unlockButton.click({ timeout: 5_000 });
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1_000);
    return true;
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

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
