const { chromium } = require('playwright');
const { chipHandlers } = require('./handlers/chipHandlers');
const { handleCustomQuestion } = require('./handlers/customQuestion');
const selectors = require('./utils/selectors');
const logger = require('./utils/logger');
const questions = require('./data/questions.json');
const keywords = require('./data/keywords.json');
const answers = require('./data/answers.json');

(async () => {
  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // ---- Manual Step: Login & navigate to filtered jobs ----
  console.log("Please log in and navigate to your Easy Apply job list.");
  await page.pause(); // allows you to manually login

  // ---- Main Loop: Iterate over job listings ----
  const jobListings = await page.$$(selectors.easyApplyButton); // grabs all visible Easy Apply buttons
  for (const jobButton of jobListings) {
    try {
      await jobButton.click(); // open modal
      await page.waitForSelector(selectors.modalContainer);

      // Iterate over screening questions
      const questionsInModal = await page.$$(selectors.screeningQuestions);
      for (const qElement of questionsInModal) {
        const label = await qElement.innerText();
        const chipType = await qElement.getAttribute('data-chip-type'); // hypothetical
        const inputType = await qElement.getAttribute('data-input-type'); // binary / number

        if (chipHandlers[chipType]) {
          await chipHandlers[chipType](page, qElement, label, inputType, answers, keywords);
        } else {
          // Handle custom question
          const matched = await handleCustomQuestion(label, page, answers, keywords);
          if (!matched) {
            logger.logCustomQuestion(label, jobButton);
            continue; // skip unknown custom questions
          }
        }
      }

      // Submit application
      const submitBtn = await page.$(selectors.submitButton);
      await submitBtn.click();

      logger.logSuccess(jobButton); // log success
    } catch (err) {
      console.error(`Error on job: ${err}`);
      logger.logFailure(jobButton, err); // log failure
      continue; // move to next job
    }

    // Randomized delay to mimic human behavior
    await page.waitForTimeout(Math.floor(Math.random() * 1500) + 500);
  }

  await browser.close();
})();
