// src/navigation.js
export async function processJobListings(page, applicationData) {
  const jobCards = await page.$$('li.jobs-search-results__list-item'); // typical selector
  console.log(`Found ${jobCards.length} job cards on page.`);

  for (let i = 0; i < jobCards.length; i++) {
    const card = jobCards[i];
    await card.click();
    await page.waitForTimeout(2000); // small pause for job detail panel

    const easyApplyButton = await page.$('button:has-text("Easy Apply")');
    if (easyApplyButton) {
      console.log(`Easy Apply available for job #${i + 1}`);
      await easyApplyButton.click();

      // For now, just close the modal instead of submitting
      await page.waitForTimeout(2000);
      const closeBtn = await page.$('button[aria-label="Dismiss"]');
      if (closeBtn) await closeBtn.click();
    }
  }

  // Handle pagination (dummy for now)
  const nextButton = await page.$('button[aria-label="Next"]');
  if (nextButton) {
    console.log("Next page available → clicking.");
    await nextButton.click();
  } else {
    console.log("No more pages.");
  }
}
