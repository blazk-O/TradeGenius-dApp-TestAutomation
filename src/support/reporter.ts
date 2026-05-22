import * as fs from 'fs';
import * as path from 'path';
import { env } from '../config/env';

type ReporterOptions = {
  theme: string;
  jsonFile: string;
  output: string;
  reportSuiteAsScenarios: boolean;
  scenarioTimestamp: boolean;
  launchReport: boolean;
  metadata: Record<string, string>;
};

export function generateHtmlReport(): void {
  const jsonFile = path.join(env.reportDir, 'cucumber-report.json');
  if (!fs.existsSync(jsonFile)) {
    // eslint-disable-next-line no-console
    console.warn(`[report] No JSON report at ${jsonFile}; skipping HTML generation.`);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const reporter = require('cucumber-html-reporter') as {
    generate: (options: ReporterOptions) => void;
  };

  const options: ReporterOptions = {
    theme: 'bootstrap',
    jsonFile,
    output: path.join(env.reportDir, 'cucumber-report.html'),
    reportSuiteAsScenarios: true,
    scenarioTimestamp: true,
    launchReport: false,
    metadata: {
      'Target URL': env.targetUrl,
      'Headless': String(env.headless),
      'Node Version': process.version,
      'Platform': process.platform,
      'Executed At': new Date().toISOString(),
    },
  };

  reporter.generate(options);
  // eslint-disable-next-line no-console
  console.log(`[report] HTML written to ${options.output}`);
}

if (require.main === module) {
  generateHtmlReport();
}
