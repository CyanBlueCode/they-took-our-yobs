// playwright.config.js
/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  use: {
    headless: false, // keep visible for debugging
    viewport: { width: 1920, height: 1080 }, // desktop window size to avoid
    ignoreHTTPSErrors: true,
    actionTimeout: 0, // disable per-action timeout
  },
  timeout: 60000, // global timeout for steps
};

module.exports = config;
