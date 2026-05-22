import * as path from 'path';
import { LaunchOptions } from 'playwright';
import { env } from './env';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  use: {
    // other context options you need
    headless: false,
    // pass the system Chromium executable to Playwright
    launchOptions: {
      executablePath: '/usr/bin/chromium-browser'
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});

use: {
  launchOptions: { executablePath: '/usr/bin/chromium-browser' }
}

export type BrowserLaunchOptions = LaunchOptions & {
  args: string[];
  viewport: { width: number; height: number };
};

export function getPersistentContextOptions(): BrowserLaunchOptions {
  const extensionPath = env.metamaskExtensionPath;
  return {
    headless: false,
    slowMo: env.slowMo,
    viewport: { width: 1280, height: 800 },
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  };
}

export function getUserDataDir(): string {
  return path.resolve(process.cwd(), '.user-data-dir');
}

export const defaultTimeouts = {
  navigation: 30_000,
  uiElement: 10_000,
  walletPopup: 30_000,
  modalAnimation: 5_000,
} as const;
