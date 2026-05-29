/**
 * Cucumber.js configuration (auto-detected as cucumber.js by the CLI).
 *
 * Cucumber 11 loads only: cucumber.js, cucumber.cjs, cucumber.mjs,
 * cucumber.json, cucumber.yaml — not cucumber.config.ts.
 */

const common = {
  requireModule: ['ts-node/register'],
  require: [
    'src/fixtures/world.ts',
    'src/support/**/*.ts',
    'src/steps/**/*.ts',
  ],
  paths: ['src/features/**/*.feature'],
  format: [
    'progress-bar',
    'json:reports/cucumber-report.json',
    'html:reports/cucumber-report.html',
    'summary',
  ],
  formatOptions: {
    snippetInterface: 'async-await',
  },
  parallel: 1,
  retry: 0,
  timeout: 60_000,
};

module.exports = {
  default: common,
};
