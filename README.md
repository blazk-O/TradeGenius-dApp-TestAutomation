# TradeGenius DApp Test Automation

Automated BDD test suite for the **TradeGenius Asset** Web3 platform
(`https://dev.tradegenius.com/asset`). Built with Playwright, Cucumber.js, and
the real MetaMask browser extension to exercise the full Web3 wallet login flow.

## Tech Stack

- Node.js 20+ / TypeScript (strict mode)
- Cucumber.js (BDD) with Gherkin `.feature` files
- Playwright (Chromium with persistent context + extension support)
- MetaMask (loaded as an unpacked Chromium extension)
- `cucumber-html-reporter` for rich HTML reports

## Project Structure

```
tradegenius-dapp-tests/
├── package.json
├── tsconfig.json
├── cucumber.js                 # Cucumber profile, paths, formatters (auto-detected)
├── .env.example
├── BUGS.md                     # Bug log
│
├── src/
│   ├── config/                 # Typed env + Playwright launch options
│   ├── fixtures/world.ts       # Cucumber World (browser/page/POM)
│   ├── pages/                  # POM: BasePage, AssetPage, WalletModal
│   ├── wallet/                 # MetaMask helpers + extension loader
│   ├── steps/                  # Step definitions
│   ├── features/               # Gherkin .feature files
│   └── support/                # Hooks + report generator
│
└── scripts/
    └── download-metamask.ts    # Pulls MetaMask zip + unpacks it
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright Chromium (host deps may need sudo on Linux)
npx playwright install chromium

# 3. Copy env template and edit values (do NOT use real funds)
cp .env.example .env

# 4. Download an unpacked MetaMask build into extensions/metamask
npm run setup:metamask
```

## Run

```bash
# Headed run (recommended; MetaMask requires a real Chromium with extensions)
npm run test

# Headed run forced via env
npm run test:headed

# Run and generate the HTML report
npm run test:report

# Type-check only
npm run type-check
```

Reports land in `./reports/`:

- `cucumber-report.json`
- `cucumber-report.html`
- `screenshots/` (on failure)

## Environment

| Variable                  | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| `TARGET_URL`              | DApp under test                                  |
| `WALLET_SEED_PHRASE`      | Seed used to import the test wallet              |
| `WALLET_PASSWORD`         | MetaMask vault password                          |
| `METAMASK_EXTENSION_PATH` | Where the unpacked MetaMask build lives          |
| `HEADLESS`                | `true`/`false` (extension support needs headed)  |
| `SLOW_MO`                 | Playwright slow-motion in ms                     |
| `SCREENSHOT_ON_FAILURE`   | Capture full-page screenshot on scenario failure |
| `REPORT_DIR`              | Output directory for reports                     |

## Headless note

MetaMask requires a real browser to load extensions. If you need headless CI,
wrap the run in `xvfb-run`:

```bash
xvfb-run -a npm test
```

Chromium’s new `--headless=new` may also work for some flows, but the MetaMask
notification popup is most reliable with headed mode.

## How the wallet flow is automated

1. `BeforeAll` downloads MetaMask if it is missing (unpacked CRX in
   `extensions/metamask`).
2. `Before` launches a persistent Chromium context with the extension preloaded
   and walks through MetaMask onboarding using the seed phrase from `.env`.
3. The `AssetPage` POM clicks **Connect Wallet**, the `WalletModal` POM selects
   MetaMask inside the Reown / AppKit modal (shadow DOM safe via Playwright
   `pierce/` selectors), and the `MetaMaskExtension` helper handles the
   resulting **Connect** popup and optional SIWE signature.
4. The address rendered on the page is asserted against the on-chain address
   read directly from MetaMask.

## Troubleshooting

- **Modal not detected:** The DApp uses Reown/AppKit; selectors live in
  `WalletModal.ts`. Open the modal in dev tools and add any new host element.
- **MetaMask popup never opens:** Ensure the persistent context is launched
  headed and that `extensions/metamask/manifest.json` exists.
- **SIWE signature step times out:** SIWE is treated as optional; the suite
  logs and continues if no signature popup appears within 15 s.
