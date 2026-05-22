import * as path from 'path';
import * as fs from 'fs';
import { Page, Locator } from 'playwright';
import { defaultTimeouts } from '../config/playwright.config';
import { env } from '../config/env';

export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(url: string): Promise<void> {
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: defaultTimeouts.navigation,
    });
  }

  async waitForNetworkIdle(timeoutMs: number = defaultTimeouts.navigation): Promise<void> {
    try {
      await this.page.waitForLoadState('networkidle', { timeout: timeoutMs });
    } catch {
      // Some DApps keep websockets open; ignore strict idle timeouts.
    }
  }

  async waitForVisible(
    locator: Locator,
    timeoutMs: number = defaultTimeouts.uiElement,
  ): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: timeoutMs });
  }

  async isVisible(locator: Locator, timeoutMs = 1_500): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }

  async screenshot(name: string): Promise<string> {
    const dir = path.join(env.reportDir, 'screenshots');
    fs.mkdirSync(dir, { recursive: true });
    const safeName = name.replace(/[^a-z0-9-_]+/gi, '_');
    const file = path.join(dir, `${safeName}-${Date.now()}.png`);
    await this.page.screenshot({ path: file, fullPage: true });
    return file;
  }

  async safeClick(locator: Locator, timeoutMs = defaultTimeouts.uiElement): Promise<void> {
    await this.waitForVisible(locator, timeoutMs);
    await locator.click({ timeout: timeoutMs });
  }

  async safeFill(
    locator: Locator,
    value: string,
    timeoutMs = defaultTimeouts.uiElement,
  ): Promise<void> {
    await this.waitForVisible(locator, timeoutMs);
    await locator.fill(value, { timeout: timeoutMs });
  }

  async getText(locator: Locator, timeoutMs = defaultTimeouts.uiElement): Promise<string> {
    await this.waitForVisible(locator, timeoutMs);
    return (await locator.textContent())?.trim() ?? '';
  }
}
