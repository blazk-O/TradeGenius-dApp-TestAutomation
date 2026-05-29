import { Given, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { DAppWorld } from '../fixtures/world';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const WALLET_ADDRESS_RE = /^0x[a-fA-F0-9]{4,40}(?:\.{2,3}[a-fA-F0-9]{2,8})?$/;

const NON_FATAL_CONSOLE_PATTERNS: ReadonlyArray<RegExp> = [
  /favicon|third-party|chrome-extension/i,
  /failed to load resource: the server responded with a status of (400|401|403|404|429|503)/i,
  /websocket connection .* failed/i,
  /batch websocket error/i,
  /failed to establish batch connection/i,
  /bad http response code \(404\).*fetching the script/i,
  /permissions policy violation: xr-spatial-tracking is not allowed/i,
  /font-size:0;color:transparent NaN/i,
];

Given('the browser is launched with MetaMask extension installed', async function (this: DAppWorld) {
  assert.ok(this.context, 'Persistent browser context not initialised');
  assert.ok(this.page, 'Primary page not initialised');
});

Given('MetaMask is configured with a test wallet', async function (this: DAppWorld) {
  const metaMask = this.requireMetaMask();
  const address = await metaMask.getAddress();
  assert.match(address, WALLET_ADDRESS_RE, `Invalid wallet address: ${address}`);
});

Given('I navigate to the TradeGenius Asset page', async function (this: DAppWorld) {
  const assetPage = this.requireAssetPage();
  await assetPage.navigate();
});

Then('the page title should contain {string}', async function (this: DAppWorld, expected: string) {
  const page = this.requirePage();
  const title = await page.title();
  assert.ok(
    title.toLowerCase().includes(expected.toLowerCase()),
    `Expected title to include "${expected}", got "${title}"`,
  );
});

Then('the {string} button should be visible', async function (this: DAppWorld, label: string) {
  if (/connect|wallet/i.test(label)) {
    await this.requireAssetPage().waitForConnectButtonVisible();
    return;
  }

  const page = this.requirePage();
  const exactLabel = new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`, 'i');
  const locator = page
    .getByRole('button', { name: exactLabel })
    .or(page.locator(`button:has-text("${label.replace(/"/g, '\\"')}")`))
    .first();
  await locator.waitFor({ state: 'visible', timeout: 10_000 });
});

Then('the page should not display any console errors', async function (this: DAppWorld) {
  const errors = (this as unknown as { __consoleErrors?: string[] }).__consoleErrors ?? [];
  const fatal = errors.filter(
    (e) => !NON_FATAL_CONSOLE_PATTERNS.some((pattern) => pattern.test(e)),
  );
  assert.deepStrictEqual(fatal, [], `Console errors detected: ${fatal.join('\n')}`);
});
