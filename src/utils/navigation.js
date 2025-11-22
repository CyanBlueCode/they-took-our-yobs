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

    await randomWait(page); // wait for lazy-load
  }

  console.log(`Final job cards loaded: ${prevCount}`);
  return await page.$$('li[data-occludable-job-id]');
}

import { processEasyApplyModal } from '../handlers/applicationHandler.js';
import { randomWait } from './timing.js';
import omitKeywords from '../data/omitKeywords.json' with { type: 'json' };

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
    await randomWait(page); // let right-hand panel render

    // Check job description for omit keywords
    if (await shouldSkipJob(page, i + 1)) {
      await dismissJob(page, i);
      continue; // Skip to next job
    }

    // Check if any modal is already open before trying Easy Apply
    const existingModal = await page.$('.artdeco-modal');
    if (existingModal) {
      console.log(`Modal already open for job #${i + 1}, closing first`);
      await closeModal(page);
      await randomWait(page);
    }

    // selector for Easy Apply or Continue
    const easyApplyButton = await page.$('button:has(span:has-text("Easy Apply"))');
    const continueButton = await page.$('button:has(span:has-text("Continue"))');
    
    if (easyApplyButton || continueButton) {
      const buttonText = easyApplyButton ? 'Easy Apply' : 'Continue';
      console.log(`${buttonText} available for job #${i + 1}`);
      
      const button = easyApplyButton || continueButton;
      await button.click();
      await randomWait(page);

      // Check for safety reminder modal with more specific selector
      const safetyHeader = await page.$('h2:has-text("Job search safety reminder")');
      if (safetyHeader) {
        console.log(`Safety reminder modal detected for job #${i + 1} - skipping potentially fraudulent job`);
        
        try {
          // Close the safety modal using the dismiss button
          const modalDismiss = await page.$('button.artdeco-modal__dismiss');
          if (modalDismiss) {
            await modalDismiss.click();
            await randomWait(page);
            console.log(`Safety modal closed for job #${i + 1}`);
          }
        } catch (error) {
          console.log(`Error closing safety modal: ${error.message}`);
        }
        
        await dismissJob(page, i);
        continue; // Skip to next job
      }

      try {
        await processEasyApplyModal(page, applicationData);
      } catch (error) {
        console.error(`Error processing application for job #${i + 1}:`, error);
        await closeModal(page);
      }
    } else {
      console.log(`No Easy Apply or Continue for job #${i + 1}`);
    }
  }

  // Pagination (make sure we only click if enabled)
  const nextButton = await page.$('button[aria-label="View next page"]:not([disabled])');
  if (nextButton) {
    console.log('Next page available → clicking.');
    const currentUrl = page.url();
    await nextButton.click();
    
    // Wait for URL to change or timeout after 5 seconds
    try {
      await page.waitForFunction(
        (oldUrl) => window.location.href !== oldUrl,
        currentUrl,
        { timeout: 5000 }
      );
    } catch (error) {
      console.log('URL did not change, continuing anyway...');
    }
    
    await randomWait(page);
    return true; // Has next page
  } else {
    console.log('No more pages.');
    return false; // No next page
  }
}

async function shouldSkipJob(page, jobNumber) {
  try {
    // Check for missing qualifications card
    // REVIEW LinkedIn missing qualification card is inaccurate
    // const fitLevelCard = await page.$('.job-details-fit-level-card');
    // if (fitLevelCard) {
    //   const fitText = await fitLevelCard.textContent();
    //   if (fitText.toLowerCase().includes('missing')) {
    //     console.log(`Job #${jobNumber} has missing qualifications - skipping`);
    //     return true;
    //   }
    // }
    
    // Check company size to filter out small startups
    const companyBox = await page.$('.jobs-company__box');
    if (companyBox) {
      const companyText = await companyBox.textContent();
      const lowerCompanyText = companyText.toLowerCase();
      if (lowerCompanyText.includes('1 employee') || lowerCompanyText.includes('2-10 employees')) {
        console.log(`Job #${jobNumber} is from small startup with <10 employees - skipping`);
        return true;
      }
    }
    
    // Get job description text
    const jobDescription = await page.$('.jobs-description__content');
    if (!jobDescription) {
      console.log(`No job description found for job #${jobNumber}`);
      return false;
    }
    
    const descriptionText = await jobDescription.textContent();
    const lowerText = descriptionText.toLowerCase();
    
    // Check strict match keywords (case insensitive)
    for (const keyword of omitKeywords.strictMatch) {
      if (lowerText.includes(keyword.toLowerCase())) {
        console.log(`Job #${jobNumber} contains omit keyword "${keyword}" - skipping`);
        return true;
      }
    }
    
    // Check word boundary keywords with exceptions
    for (const keyword of omitKeywords.wordBoundaryMatch) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
      if (regex.test(lowerText)) {
        // Check if it's an allowed exception
        let isException = false;
        for (const exception of omitKeywords.allowedExceptions) {
          if (lowerText.includes(exception.toLowerCase())) {
            isException = true;
            break;
          }
        }
        
        if (!isException) {
          console.log(`Job #${jobNumber} contains omit keyword "${keyword}" - skipping`);
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.log(`Error checking job description for job #${jobNumber}: ${error.message}`);
    return false;
  }
}

async function dismissJob(page, jobIndex) {
  try {
    // Get the specific job card and find its dismiss button
    const jobCards = await page.$$('div.job-card-container--clickable');
    const jobCard = jobCards[jobIndex];
    
    if (jobCard) {
      const dismissBtn = await jobCard.$('button[aria-label*="Dismiss"]');
      if (dismissBtn) {
        await dismissBtn.click();
        await randomWait(page);
        console.log('Job dismissed from list');
      }
    }
  } catch (error) {
    console.log('Could not dismiss job, continuing...');
  }
}

async function closeModal(page) {
  try {
    // Check for discard confirmation modal first (blocks other clicks)
    const discardConfirmModal = await page.$('[data-test-modal-id="data-test-easy-apply-discard-confirmation"]');
    if (discardConfirmModal) {
      console.log('Discard confirmation modal blocking - clicking discard');
      const discardBtn = await page.$('button:has-text("Discard")');
      if (discardBtn) {
        await discardBtn.click();
        await randomWait(page);
        return;
      }
    }
    
    const closeBtn = await page.$('button.artdeco-modal__dismiss');
    if (closeBtn) {
      await closeBtn.click();
      await randomWait(page);

      const discardBtn = await page.$('button:has-text("Discard")');
      if (discardBtn) {
        console.log('Discard prompt detected → discarding.');
        await discardBtn.click();
        await randomWait(page);
      }
    }
  } catch (error) {
    console.log('Error closing modal, continuing to next job');
  }
}

