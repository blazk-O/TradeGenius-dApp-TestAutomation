import { When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { DAppWorld } from '../fixtures/world';

When('I click the {string} button', async function (this: DAppWorld, label: string) {
  if (label.toLowerCase().includes('connect')) {
    const assetPage = this.requireAssetPage();
    await assetPage.clickConnectWallet();
    return;
  }
  const page = this.requirePage();
  const locator = page.locator(`button:has-text("${label}")`).first();
  await locator.waitFor({ state: 'visible', timeout: 10_000 });
  await locator.click();
});

Then('the wallet selection modal should be visible', async function (this: DAppWorld) {
  const modal = this.requireWalletModal();
  await modal.waitForModal();
  assert.ok(await modal.isVisible(), 'Wallet selection modal did not appear');
});

When('I select {string} from the wallet options', async function (this: DAppWorld, name: string) {
  const modal = this.requireWalletModal();
  await modal.selectWalletByName(name);
});

Then('the MetaMask connection popup should appear', async function (this: DAppWorld) {
  const metaMask = this.requireMetaMask();
  await metaMask.waitForPopup();
});

When('I approve the wallet connection in MetaMask', async function (this: DAppWorld) {
  const metaMask = this.requireMetaMask();
  await metaMask.approveConnection();
  try {
    await metaMask.signMessage(15_000);
  } catch {
    // SIWE may not be required; ignore if no signature popup appears.
  }
});

When('I dismiss the wallet modal', async function (this: DAppWorld) {
  const modal = this.requireWalletModal();
  await modal.dismiss();
});

Then('the modal should no longer be visible', async function (this: DAppWorld) {
  const modal = this.requireWalletModal();
  const visible = await modal.isVisible();
  assert.strictEqual(visible, false, 'Wallet modal is still visible after dismiss');
});

Then('at least one wallet provider option should be displayed', async function (this: DAppWorld) {
  const modal = this.requireWalletModal();
  const names = await modal.listAvailableWalletNames();
  assert.ok(names.length > 0, 'No wallet providers detected inside the modal');
});
