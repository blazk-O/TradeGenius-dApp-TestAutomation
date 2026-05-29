import {
  setWorldConstructor,
  setDefaultTimeout,
  World,
  IWorldOptions,
} from '@cucumber/cucumber';
import { BrowserContext, Page, Browser } from 'playwright';
import { AssetPage } from '../pages/AssetPage';
import { WalletModal } from '../pages/WalletModal';
import { MetaMaskExtension } from '../wallet/MetaMaskExtension';

setDefaultTimeout(120_000);

export class DAppWorld extends World {
  public browser: Browser | undefined;
  public context: BrowserContext | undefined;
  public page: Page | undefined;

  public assetPage: AssetPage | undefined;
  public walletModal: WalletModal | undefined;
  public metaMask: MetaMaskExtension | undefined;

  public scenarioName = 'unknown-scenario';

  constructor(options: IWorldOptions) {
    super(options);
  }

  requirePage(): Page {
    if (!this.page || this.page.isClosed()) {
      const replacement = this.context
        ?.pages()
        .find((page) => !page.isClosed() && !page.url().startsWith('chrome-extension://'));
      if (replacement) {
        this.page = replacement;
        this.assetPage = new AssetPage(replacement);
        this.walletModal = new WalletModal(replacement);
      }
    }
    if (!this.page || this.page.isClosed()) throw new Error('World.page is not initialised');
    return this.page;
  }

  requireContext(): BrowserContext {
    if (!this.context) throw new Error('World.context is not initialised');
    return this.context;
  }

  requireAssetPage(): AssetPage {
    this.requirePage();
    if (!this.assetPage) throw new Error('World.assetPage is not initialised');
    return this.assetPage;
  }

  requireWalletModal(): WalletModal {
    this.requirePage();
    if (!this.walletModal) throw new Error('World.walletModal is not initialised');
    return this.walletModal;
  }

  requireMetaMask(): MetaMaskExtension {
    if (!this.metaMask) throw new Error('World.metaMask is not initialised');
    return this.metaMask;
  }

  async openFreshAssetPage(): Promise<AssetPage> {
    const page = await this.requireContext().newPage();
    this.page = page;
    this.assetPage = new AssetPage(page);
    this.walletModal = new WalletModal(page);
    await this.assetPage.navigate();
    return this.assetPage;
  }

  async waitForAppPage(timeoutMs = 10_000): Promise<AssetPage> {
    const existing = this.requireContext()
      .pages()
      .find((page) => !page.isClosed() && !page.url().startsWith('chrome-extension://'));
    const page = existing ?? await this.requireContext().waitForEvent('page', {
      predicate: (candidate) => !candidate.url().startsWith('chrome-extension://'),
      timeout: timeoutMs,
    });
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    this.page = page;
    this.assetPage = new AssetPage(page);
    this.walletModal = new WalletModal(page);
    return this.assetPage;
  }
}

setWorldConstructor(DAppWorld);
