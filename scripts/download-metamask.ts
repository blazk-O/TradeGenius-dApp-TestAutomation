import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { IncomingMessage } from 'http';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const unzipper = require('unzipper') as {
  Open: { buffer: (b: Buffer) => Promise<{ extract: (o: { path: string }) => Promise<void> }> };
};

const METAMASK_VERSION = process.env.METAMASK_VERSION ?? '12.10.1';
const RELEASE_URL =
  process.env.METAMASK_DOWNLOAD_URL ??
  `https://github.com/MetaMask/metamask-extension/releases/download/v${METAMASK_VERSION}/metamask-chrome-${METAMASK_VERSION}.zip`;

const TARGET_DIR = path.resolve(
  process.cwd(),
  process.env.METAMASK_EXTENSION_PATH ?? './extensions/metamask',
);

function fetchBuffer(url: string, redirects = 5): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (redirects < 0) {
      reject(new Error('Too many redirects'));
      return;
    }
    https
      .get(url, (res: IncomingMessage) => {
        if (
          (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) &&
          res.headers.location
        ) {
          resolve(fetchBuffer(res.headers.location, redirects - 1));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function main(): Promise<void> {
  if (
    fs.existsSync(TARGET_DIR) &&
    fs.existsSync(path.join(TARGET_DIR, 'manifest.json'))
  ) {
    // eslint-disable-next-line no-console
    console.log(`[metamask] Extension already present at ${TARGET_DIR}`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[metamask] Downloading v${METAMASK_VERSION} from ${RELEASE_URL}`);
  const zipBuffer = await fetchBuffer(RELEASE_URL);

  fs.mkdirSync(TARGET_DIR, { recursive: true });
  const directory = await unzipper.Open.buffer(zipBuffer);
  await directory.extract({ path: TARGET_DIR });

  if (!fs.existsSync(path.join(TARGET_DIR, 'manifest.json'))) {
    throw new Error(`Extraction succeeded but manifest.json missing in ${TARGET_DIR}`);
  }
  // eslint-disable-next-line no-console
  console.log(`[metamask] Extracted to ${TARGET_DIR}`);
}

main().catch((err: Error) => {
  // eslint-disable-next-line no-console
  console.error('[metamask] Download failed:', err.message);
  process.exit(1);
});
