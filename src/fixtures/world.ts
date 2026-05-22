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
    if (!this.page) throw new Error('World.page is not initialised');
    return this.page;
  }

  requireContext(): BrowserContext {
    if (!this.context) throw new Error('World.context is not initialised');
    return this.context;
  }

  requireAssetPage(): AssetPage {
    if (!this.assetPage) throw new Error('World.assetPage is not initialised');
    return this.assetPage;
  }

  requireWalletModal(): WalletModal {
    if (!this.walletModal) throw new Error('World.walletModal is not initialised');
    return this.walletModal;
  }

  requireMetaMask(): MetaMaskExtension {
    if (!this.metaMask) throw new Error('World.metaMask is not initialised');
    return this.metaMask;
  }
}

setWorldConstructor(DAppWorld);
