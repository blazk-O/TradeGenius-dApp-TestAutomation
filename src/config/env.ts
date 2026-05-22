import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value !== undefined && value !== '') return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

function parseBool(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseInt10(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export type Env = Readonly<{
  targetUrl: string;
  walletSeedPhrase: string;
  walletPassword: string;
  metamaskExtensionPath: string;
  headless: boolean;
  slowMo: number;
  screenshotOnFailure: boolean;
  reportDir: string;
}>;

export const env: Env = Object.freeze({
  targetUrl: requireEnv('TARGET_URL', 'https://dev.tradegenius.com/asset'),
  walletSeedPhrase: requireEnv(
    'WALLET_SEED_PHRASE',
    'test test test test test test test test test test test junk',
  ),
  walletPassword: requireEnv('WALLET_PASSWORD', 'TestPassword123!'),
  metamaskExtensionPath: path.resolve(
    process.cwd(),
    requireEnv('METAMASK_EXTENSION_PATH', './extensions/metamask'),
  ),
  headless: parseBool('HEADLESS', false),
  slowMo: parseInt10('SLOW_MO', 100),
  screenshotOnFailure: parseBool('SCREENSHOT_ON_FAILURE', true),
  reportDir: path.resolve(
    process.cwd(),
    requireEnv('REPORT_DIR', './reports'),
  ),
});
