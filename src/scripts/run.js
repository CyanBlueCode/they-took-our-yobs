// DUMMY run-through script
import { chromium } from 'playwright';
import { processJobListings } from '../src/navigation.js';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Open LinkedIn, log in manually, and navigate to your desired job search page.");
  console.log("Then press Enter here to start automation...");

  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  process.stdin.once("data", async () => {
    const applicationData = JSON.parse(fs.readFileSync('./data/application.json', 'utf-8'));
    await processJobListings(page, applicationData);
    console.log("Run finished.");
    await browser.close();
    process.exit(0);
  });
})();
