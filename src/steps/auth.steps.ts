import { Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { DAppWorld } from '../fixtures/world';

Then('I should be logged in with my wallet address visible', async function (this: DAppWorld) {
  const assetPage = this.requireAssetPage();
  const deadline = Date.now() + 30_000;
  let loggedIn = false;
  while (Date.now() < deadline) {
    if (await assetPage.isUserLoggedIn()) {
      loggedIn = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(loggedIn, 'User does not appear to be logged in (no address/avatar detected)');
  const address = await assetPage.getConnectedAddress();
  assert.match(address, /0x[a-fA-F0-9]{4,40}/, `Invalid address rendered: ${address}`);
});

Then('I should not be logged in', async function (this: DAppWorld) {
  const assetPage = this.requireAssetPage();
  const loggedIn = await assetPage.isUserLoggedIn();
  assert.strictEqual(loggedIn, false, 'User unexpectedly appears to be logged in');
});
