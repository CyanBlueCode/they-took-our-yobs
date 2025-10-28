import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const STORAGE_PATH = path.resolve('storageState.json');
const CONFIG_PATH = path.resolve('src/data/config.json');

(async () => {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.linkedin.com/login');
  
  // Auto-fill login form
  await page.fill('input[name="session_key"]', config.loginUserName);
  await page.fill('input[name="session_password"]', config.loginPassword);
  
  // Uncheck "Keep me logged in" checkbox by clicking label
  await page.click('label[for="rememberMeOptIn-checkbox"]');
  
  console.log("Login form auto-filled and 'Keep me logged in' unchecked. Please manually submit and then press ENTER to save state...");
  process.stdin.once('data', async () => {
    await context.storageState({ path: STORAGE_PATH });
    console.log(`Saved authentication state to ${STORAGE_PATH}`);
    await browser.close();
    process.exit(0);
  });
})();
