import { chromium } from 'playwright';
import path from 'path';

const STORAGE_PATH = path.resolve('storageState.json');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.linkedin.com/login');
  console.log("Please log in manually, then press ENTER in this terminal to save state...");
  process.stdin.once('data', async () => {
    await context.storageState({ path: STORAGE_PATH });
    console.log(`Saved authentication state to ${STORAGE_PATH}`);
    await browser.close();
    process.exit(0);
  });
})();
