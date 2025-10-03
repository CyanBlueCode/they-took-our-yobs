// Scroll event to mitigate lazy loading incomplete list
export async function loadAllJobCards(page, maxScrolls = 20) {
  const listSelector = 'ul:has(li[data-occludable-job-id])';
  const list = await page.$(listSelector);
  if (!list) throw new Error('Job results list not found');

  let prevCount = 0;
  for (let i = 0; i < maxScrolls; i++) {
    const cards = await page.$$('li[data-occludable-job-id]');
    const count = cards.length;

    if (count === prevCount) {
      console.log('No more job cards loaded.');
      break;
    }
    prevCount = count;

    // scroll the container
    await list.evaluate((el) => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });

    await page.waitForTimeout(2000); // wait for lazy-load
  }

  console.log(`Final job cards loaded: ${prevCount}`);
  return await page.$$('li[data-occludable-job-id]');
}

import { processEasyApplyModal } from '../handlers/applicationHandler.js';

export async function processJobListings(page, applicationData) {
  // Grab fresh job cards each loop iteration to avoid stale element handles
  const jobCards = await loadAllJobCards(page);
  console.log(`Found ${jobCards.length} job cards on page.`);

  for (let i = 0; i < jobCards.length; i++) {
    const jobCardsFresh = await page.$$('div.job-card-container--clickable');
    const card = jobCardsFresh[i];

    if (!card) {
      console.warn(`Card ${i} missing, skipping.`);
      continue;
    }

    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForTimeout(2000); // let right-hand panel render

    // selector for Easy Apply
    const easyApplyButton = await page.$(
      'button:has(span:has-text("Easy Apply"))'
    );
    if (easyApplyButton) {
      console.log(`Easy Apply available for job #${i + 1}`);
      await easyApplyButton.click();
      await page.waitForTimeout(2000);

      try {
        await processEasyApplyModal(page, applicationData);
      } catch (error) {
        console.error(`Error processing application for job #${i + 1}:`, error);
        await closeModal(page);
      }
    } else {
      console.log(`No Easy Apply for job #${i + 1}`);
    }
  }

  // Pagination (make sure we only click if enabled)
  const nextButton = await page.$('button[aria-label="Next"]:not([disabled])');
  if (nextButton) {
    console.log('Next page available → clicking.');
    await nextButton.click();
    await page.waitForTimeout(3000); // let page refresh
  } else {
    console.log('No more pages.');
  }
}

async function closeModal(page) {
  const closeBtn = await page.$('button.artdeco-modal__dismiss');
  if (closeBtn) {
    await closeBtn.click();
    await page.waitForTimeout(1000);

    const discardBtn = await page.$('button:has-text("Discard")');
    if (discardBtn) {
      console.log('Discard prompt detected → discarding.');
      await discardBtn.click();
    }
  }
}

