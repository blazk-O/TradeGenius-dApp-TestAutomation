import * as fs from 'fs';
import * as path from 'path';
import * as child from 'child_process';
import {
  Before,
  BeforeAll,
  After,
  AfterAll,
  Status,
  ITestCaseHookParameter,
} from '@cucumber/cucumber';
import { DAppWorld } from '../fixtures/world';
import { env } from '../config/env';
import { launchWithMetaMask } from '../wallet/extensionLoader';
import { MetaMaskExtension } from '../wallet/MetaMaskExtension';
import { AssetPage } from '../pages/AssetPage';
import { WalletModal } from '../pages/WalletModal';
import { generateHtmlReport } from './reporter';

BeforeAll({ timeout: 5 * 60 * 1000 }, async function () {
  if (!fs.existsSync(env.metamaskExtensionPath) ||
      !fs.existsSync(path.join(env.metamaskExtensionPath, 'manifest.json'))) {
    // eslint-disable-next-line no-console
    console.log('[setup] MetaMask not found — downloading via scripts/download-metamask.ts');
    child.execFileSync(
      'node',
      ['-r', 'ts-node/register', path.join('scripts', 'download-metamask.ts')],
      { stdio: 'inherit' },
    );
  }
  fs.mkdirSync(env.reportDir, { recursive: true });
});

Before({ timeout: 3 * 60 * 1000 }, async function (this: DAppWorld, scenario: ITestCaseHookParameter) {
  this.scenarioName = scenario.pickle?.name ?? 'unknown-scenario';

  const context = await launchWithMetaMask();
  this.context = context;

  const errors: string[] = [];
  (this as unknown as { __consoleErrors: string[] }).__consoleErrors = errors;
  context.on('weberror', (err) => errors.push(String(err.error())));

  const existingPage = context.pages()[0];
  const page = existingPage ?? (await context.newPage());
  this.page = page;
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  this.assetPage = new AssetPage(page);
  this.walletModal = new WalletModal(page);
  this.metaMask = new MetaMaskExtension(context);

  await this.metaMask.completeOnboarding().catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[setup] MetaMask onboarding skipped or already complete:', err.message);
  });

  await page.bringToFront();
});

After(async function (this: DAppWorld, scenario: ITestCaseHookParameter) {
  if (env.screenshotOnFailure && scenario.result?.status === Status.FAILED && this.assetPage) {
    try {
      const file = await this.assetPage.screenshot(this.scenarioName);
      this.attach(fs.readFileSync(file), 'image/png');
    } catch {
      // ignore screenshot errors
    }
  }
  if (this.context) {
    await this.context.close().catch(() => undefined);
  }
});

AfterAll(async function () {
  try {
    generateHtmlReport();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[report] Failed to generate HTML report:', (err as Error).message);
  }
});
