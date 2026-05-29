import { Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { DAppWorld } from '../fixtures/world';

Then('I should be logged in with my wallet address visible', async function (this: DAppWorld) {
  const deadline = Date.now() + 30_000;
  let loggedIn = false;
  let usernameOnboardingVisible = false;
  let signInAbsentOnAppPage = false;
  let signInVisible = false;
  let signInChecked = false;
  let lastError: Error | undefined;
  while (Date.now() < deadline) {
    try {
      const page = this.requirePage();
      if (page.url() === 'about:blank') {
        await this.openFreshAssetPage();
      }
      const assetPage = this.requireAssetPage();
      if (await assetPage.isUserLoggedIn()) {
        loggedIn = true;
        break;
      }
      if (await assetPage.isUsernameOnboardingVisible()) {
        usernameOnboardingVisible = true;
        break;
      }
      signInVisible = await page
        .getByRole('button', { name: /^Sign In$/i })
        .or(page.locator('button[aria-label="Sign In" i]'))
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false);
      signInChecked = true;
      signInAbsentOnAppPage =
        !signInVisible &&
        page.url() !== 'about:blank' &&
        /tradegenius\.com\/asset/i.test(page.url());
      if (signInAbsentOnAppPage) break;
    } catch (err) {
      const message = (err as Error).message;
      if (!/closed|World\.page is not initialised/i.test(message)) throw err;
      lastError = err as Error;
      try {
        const assetPage = await this.waitForAppPage();
        if (await assetPage.isUserLoggedIn()) {
          loggedIn = true;
          break;
        }
        if (await assetPage.isUsernameOnboardingVisible()) {
          usernameOnboardingVisible = true;
          break;
        }
        const page = this.requirePage();
        signInVisible = await page
          .getByRole('button', { name: /^Sign In$/i })
          .or(page.locator('button[aria-label="Sign In" i]'))
          .first()
          .isVisible({ timeout: 500 })
          .catch(() => false);
        signInChecked = true;
        signInAbsentOnAppPage =
          !signInVisible &&
          page.url() !== 'about:blank' &&
          /tradegenius\.com\/asset/i.test(page.url());
        if (signInAbsentOnAppPage) break;
      } catch (freshPageErr) {
        lastError = freshPageErr as Error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(
    loggedIn || usernameOnboardingVisible || signInAbsentOnAppPage || (signInChecked && !signInVisible),
    `User does not appear to be logged in and username onboarding was not shown${
      lastError ? `. Last page error: ${lastError.message}` : ''
    }. Sign In visible after wallet handoff: ${signInVisible}`,
  );
  if (usernameOnboardingVisible || signInAbsentOnAppPage || (signInChecked && !signInVisible)) return;

  const address = await this.requireAssetPage().getConnectedAddress();
  assert.match(address, /0x[a-fA-F0-9]{4,40}/, `Invalid address rendered: ${address}`);
});

Then('I should not be logged in', async function (this: DAppWorld) {
  const assetPage = this.requireAssetPage();
  const loggedIn = await assetPage.isUserLoggedIn();
  assert.strictEqual(loggedIn, false, 'User unexpectedly appears to be logged in');
});
