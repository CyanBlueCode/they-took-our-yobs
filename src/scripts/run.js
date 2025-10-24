// DUMMY run-through script
import { chromium } from 'playwright';
import { processJobListings } from '../utils/navigation.js';
import fs from 'fs';

(async () => {
  // const browser = await chromium.launch({ headless: false, slowMo: 50 });
  // const context = await browser.newContext();
  // const page = await context.newPage();
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({
    storageState: 'storageState.json',
    viewport: null,
  });
  const page = await context.newPage();

  // Start on the page you normally go to after login
  await page.goto(
    'https://www.linkedin.com/jobs/search/?f_AL=true&f_WT=2&geoId=103644278&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true'
  );

  console.log(
    'Open LinkedIn, log in manually, and navigate to your desired job search page.'
  );
  console.log('Then press Enter here to start automation...');

  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.once('data', async () => {
    const applicationData = JSON.parse(
      fs.readFileSync('src/data/application.json', 'utf-8')
    );
    await processJobListings(page, applicationData);
    console.log('Run finished.');
    page.waitForTimeout(10000000);
    // NOTE COMMENT OUT FOR DEV
    // await browser.close();
    // process.exit(0);
  });
})();

// REVIEW: flow: run.js (entry) -> navigation.js -> applicationHandler.js
