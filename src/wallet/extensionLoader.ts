import * as fs from 'fs';
import * as path from 'path';
import { BrowserContext, chromium } from 'playwright';
import { env } from '../config/env';
import {
  getPersistentContextOptions,
  getUserDataDir,
} from '../config/playwright.config';

export async function assertExtensionInstalled(): Promise<void> {
  const target = env.metamaskExtensionPath;
  if (!fs.existsSync(target)) {
    throw new Error(
      `MetaMask extension not found at ${target}. Run "npm run setup:metamask" first.`,
    );
  }
  const manifest = path.join(target, 'manifest.json');
  if (!fs.existsSync(manifest)) {
    throw new Error(`MetaMask manifest.json missing at ${manifest}.`);
  }
}

export async function launchWithMetaMask(): Promise<BrowserContext> {
  await assertExtensionInstalled();

  const userDataDir = getUserDataDir();
  fs.mkdirSync(userDataDir, { recursive: true });

  const options = getPersistentContextOptions();
  return chromium.launchPersistentContext(userDataDir, options);
}

export async function getMetaMaskExtensionId(context: BrowserContext): Promise<string> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    for (const sw of context.serviceWorkers()) {
      const url = sw.url();
      const match = url.match(/^chrome-extension:\/\/([a-p]{32})\//);
      if (match) return match[1];
    }
    for (const page of context.pages()) {
      const url = page.url();
      const match = url.match(/^chrome-extension:\/\/([a-p]{32})\//);
      if (match) return match[1];
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Could not detect MetaMask extension ID from context.');
}
