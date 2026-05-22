import { Given, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { DAppWorld } from '../fixtures/world';

Given('the browser is launched with MetaMask extension installed', async function (this: DAppWorld) {
  assert.ok(this.context, 'Persistent browser context not initialised');
  assert.ok(this.page, 'Primary page not initialised');
});

Given('MetaMask is configured with a test wallet', async function (this: DAppWorld) {
  const metaMask = this.requireMetaMask();
  const address = await metaMask.getAddress();
  assert.match(address, /^0x[a-fA-F0-9]{4,40}$/, `Invalid wallet address: ${address}`);
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
  const page = this.requirePage();
  const locator = page.locator(`button:has-text("${label}")`).first();
  await locator.waitFor({ state: 'visible', timeout: 10_000 });
});

Then('the page should not display any console errors', async function (this: DAppWorld) {
  const errors = (this as unknown as { __consoleErrors?: string[] }).__consoleErrors ?? [];
  const fatal = errors.filter((e) => !/favicon|third-party|chrome-extension/i.test(e));
  assert.deepStrictEqual(fatal, [], `Console errors detected: ${fatal.join('\n')}`);
});
