import { logFailure } from '../utils/logger.js';

export async function processEasyApplyModal(page, applicationData) {
  const maxSteps = 12;
  let currentStep = 0;

  // TODO figure FIRST how to timeout/pause the Playwright browser window on validation error for dev; alt,
  // you can just comment out the auto-advance flow during dev (navigation.js)
  // ANCHOR step 1. make default questions work properly
  // TODO implement page.waitForTimeout(2000) to pause the app on error instead of using ctrl+c to quit out
  try {
    while (currentStep < maxSteps) {
      console.log(`Processing modal step ${currentStep + 1}`);

      // Uncheck follow company checkbox on first page
      if (currentStep === 0) {
        await uncheckFollowCompany(page);
      }

      // Fill form fields
      await fillFormFields(page, applicationData);

      // Check for next/submit buttons
      const nextBtn = await page.$('button[data-easy-apply-next-button]');
      const reviewBtn = await page.$('button[data-live-test-easy-apply-review-button]');
      const submitBtn = await page.$('button[data-live-test-easy-apply-submit-button]');

      if (submitBtn) {
        console.log('Submit button found - submitting application');
        await submitBtn.click();
        await page.waitForTimeout(2000);
        break;
      } else if (nextBtn) {
        console.log('Next button found - proceeding to next step');
        await nextBtn.click();
        await page.waitForTimeout(2000);
        currentStep++;
      } else if (reviewBtn) {
        console.log('Review button found - proceeding to submit');
        await reviewBtn.click();
        await page.waitForTimeout(1500);
      } else {
        console.log('No next/submit button found - ending modal process');
         page.waitForTimeout(100000000);
        break;
      }
    }
  } catch (error) {
    if (error.message === 'VALIDATION_ERROR') {
      await handleValidationError(page);
    }
    page.waitForTimeout(100000000);
    throw error;
  }
}

// ANCHOR step 2. make sure on validation fail, we log questions for manual answering at EOD
// NOTE for jobId's, we might want to keep them in a separate key altogether
// step 2.1. create a new alt flow that allows us to run through applicationHandler.js flow again, but for a
// specific list of jobId's only
// TODO error handling
async function handleValidationError(page) {
  try {
    const jobId = await getJobId(page);
    const url = page.url();
    logFailure({ jobId, url }, 'Validation error - required fields missing');
    
    console.log('Waiting 6 seconds before closing modal...');
    await page.waitForTimeout(6000);
    
    // Close modal and save
    const closeBtn = await page.$('button.artdeco-modal__dismiss');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
      
      const saveBtn = await page.$('button:has-text("Save")');
      if (saveBtn) {
        console.log('Saving application due to validation error');
        await saveBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  } catch (error) {
    console.log('Error in validation error handler, continuing...');
  }
}

async function getJobId(page) {
  const jobCard = await page.$('li[data-occludable-job-id].jobs-search-results__list-item--active');
  if (jobCard) {
    return await jobCard.getAttribute('data-occludable-job-id');
  }
  return 'unknown';
}

async function uncheckFollowCompany(page) {
  const followCheckbox = await page.$('#follow-company-checkbox');
  if (followCheckbox) {
    const isChecked = await followCheckbox.isChecked();
    if (isChecked) {
      console.log('Unchecking follow company checkbox');
      await followCheckbox.uncheck();
    }
  }
}

async function fillFormFields(page, applicationData) {
  // Fill text inputs
  const textInputs = await page.$$('input.artdeco-text-input--input');
  for (const input of textInputs) {
    await fillTextInput(page, input, applicationData);
  }

  // Fill dropdowns
  const dropdowns = await page.$$('select.fb-dash-form-element__select-dropdown');
  for (const dropdown of dropdowns) {
    await fillDropdown(page, dropdown, applicationData);
  }
  
  // Check for validation errors
  const errorElements = await page.$$('.artdeco-inline-feedback--error');
  if (errorElements.length > 0) {
    console.log('Validation errors detected, logging and saving application');
    throw new Error('VALIDATION_ERROR');
  }
}

async function fillTextInput(page, input, applicationData) {
  const value = await input.inputValue();
  if (value) {
    console.log('Input already filled, skipping');
    return;
  }

  const label = await getInputLabel(page, input);
  const fillValue = getAnswerForLabel(label, applicationData);

  if (fillValue) {
    console.log(`Filling text input "${label}" with: ${fillValue}`);
    await input.fill(fillValue);
    await page.waitForTimeout(500);
  }
}

async function fillDropdown(page, dropdown, applicationData) {
  const selectedValue = await dropdown.inputValue();
  if (selectedValue && selectedValue !== 'Select an option') {
    console.log('Dropdown already selected, skipping');
    return;
  }

  const label = await getDropdownLabel(page, dropdown);
  const fillValue = getAnswerForLabel(label, applicationData);
  
  console.log(`Dropdown label: "${label}", looking for value: "${fillValue}"`);

  if (fillValue) {
    const options = await dropdown.$$('option');
    let found = false;
    
    for (const option of options) {
      const optionText = await option.textContent();
      const optionValue = await option.getAttribute('value');
      
      if (optionText?.toLowerCase().includes(fillValue.toLowerCase()) || 
          optionValue?.toLowerCase().includes(fillValue.toLowerCase())) {
        console.log(`Selecting dropdown "${label}" option: ${optionText}`);
        await dropdown.selectOption(optionValue);
        await page.waitForTimeout(500);
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.log(`No matching option found for "${fillValue}" in dropdown "${label}"`);
    }
  } else {
    console.log(`No answer found for dropdown "${label}"`);
  }
}

async function getInputLabel(page, input) {
  const inputId = await input.getAttribute('id');
  if (inputId) {
    const label = await page.$(`label[for="${inputId}"]`);
    if (label) {
      return await label.textContent();
    }
  }
  return '';
}

async function getDropdownLabel(page, dropdown) {
  const dropdownId = await dropdown.getAttribute('id');
  if (dropdownId) {
    const label = await page.$(`label[for="${dropdownId}"]`);
    if (label) {
      const text = await label.textContent();
      return text.replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

import questions from '../data/questions.json' with { type: 'json' };
import keywords from '../data/keywords.json' with { type: 'json' };
import answers from '../data/answers.json' with { type: 'json' };

function getAnswerForLabel(label, applicationData) {
  if (!label) return null;

  const cleanLabel = label.replace(/\s+/g, ' ').trim();
  const lowerLabel = cleanLabel.toLowerCase();

  // Direct application data matches
  if (lowerLabel.includes('phone') || lowerLabel.includes('mobile')) {
    return applicationData.phone;
  }
  if (lowerLabel.includes('email')) {
    return applicationData.email;
  }
  if (lowerLabel.includes('name')) {
    return applicationData.fullName;
  }

  // Work authorization
  if (lowerLabel.includes('legally authorized to work')) {
    return answers.boolean['work-authorization'] ? 'Yes' : 'No';
  }

  // Relocation/states
  if (lowerLabel.includes('relocating') || lowerLabel.includes('reside')) {
    return answers.location || null;
  }

  // Match against questions.json patterns using partial matching
  for (const questionPattern of questions) {
    const questionLower = questionPattern.question.toLowerCase();
    if (lowerLabel.includes(questionLower) || questionLower.includes(lowerLabel)) {
      return getAnswerById(questionPattern.id, lowerLabel);
    }
  }

  // Experience questions with tech keywords
  if (lowerLabel.includes('experience') && lowerLabel.includes('years')) {
    const techMatch = findTechKeyword(lowerLabel);
    if (techMatch && answers.experienceYears[techMatch]) {
      return answers.experienceYears[techMatch].toString();
    }
  }

  return null;
}

function getAnswerById(questionId, label) {
  // Check for direct answer in answers.json
  if (answers.boolean && answers.boolean[questionId] !== undefined) {
    return answers.boolean[questionId] ? 'Yes' : 'No';
  }
  
  // Handle specific cases
  if (questionId === 'linkedin-profile') {
    return answers.linkedinProfile || null;
  }
  
  if (questionId === 'website') {
    return answers.website || null;
  }
  
  if (questionId === 'location') {
    return answers.location || null;
  }
  
  return null;
}

function findTechKeyword(label) {
  for (const [tech, variations] of Object.entries(keywords.tech)) {
    if (variations.some(variation => label.includes(variation))) {
      return tech;
    }
  }
  return null;
}

export async function applyToJob(page, applicationData) {
  console.log('Pretending to upload resume:', applicationData.resumePath);
  console.log('Application submitted for dummy job!');
}
