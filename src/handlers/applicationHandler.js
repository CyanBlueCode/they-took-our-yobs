import config from '../data/config.json' with { type: 'json' };
import { randomWait } from '../utils/timing.js';

export async function processEasyApplyModal(page, applicationData) {
  const maxSteps = 12;
  let currentStep = 0;

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
        // Uncheck follow company checkbox on last page
        await uncheckFollowCompany(page);
        console.log('Submit button found - submitting application');
        await submitBtn.click();
        await randomWait(page);
        
        // Close success modal
        const successModalClose = await page.$('button[data-test-modal-close-btn]');
        if (successModalClose) {
          console.log('Closing success modal');
          await successModalClose.click();
          await randomWait(page);
        }
        break;
      } else if (nextBtn) {
        console.log('Next button found - proceeding to next step');
        await nextBtn.click();
        await randomWait(page);
        currentStep++;
      } else if (reviewBtn) {
        console.log('Review button found - proceeding to submit');
        await reviewBtn.click();
        await randomWait(page);
      } else {
        console.log('No next/submit button found - ending modal process');
        break;
      }
    }
  } catch (error) {
    if (error.message === 'VALIDATION_ERROR') {
      await handleValidationError(page);
    }
    throw error;
  }
}

async function handleValidationError(page) {
  try {
    console.log('Validation error - required fields missing');
    
    // Development pause feature
    if (config.developmentMode && config.pauseOnValidationError) {
      console.log('\n' + '='.repeat(60));
      console.log('🛑 DEVELOPMENT PAUSE: VALIDATION ERROR DETECTED!');
      console.log('='.repeat(60));
      console.log('Inspect the form now. Options:');
      console.log('  • Press ENTER to continue immediately');
      console.log('  • Press SPACE to pause indefinitely');
      console.log('  • Press Ctrl+C to stop completely');
      console.log('='.repeat(60));
      
      // Set up stdin for immediate key detection
      process.stdin.setRawMode(true);
      process.stdin.resume();
      
      let paused = false;
      let shouldContinue = false;
      
      const keyListener = (key) => {
        if (key === '\r' || key === '\n') { // Enter key
          shouldContinue = true;
        } else if (key === ' ') { // Space key
          paused = true;
          console.log('\n⏸️  PAUSED INDEFINITELY - Press ENTER to continue or Ctrl+C to stop');
        } else if (key === '\u0003') { // Ctrl+C
          process.exit(0);
        }
      };
      
      process.stdin.on('data', keyListener);
      
      // Countdown with pause support
      for (let i = config.pauseDurationSeconds; i > 0 && !shouldContinue; i--) {
        if (paused) {
          // Wait indefinitely when paused
          while (paused && !shouldContinue) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          break;
        }
        process.stdout.write(`\rAuto-continuing in ${i} seconds...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Cleanup
      process.stdin.removeListener('data', keyListener);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      
      console.log('\n' + '='.repeat(60));
      console.log('🔄 CONTINUING WITH ERROR HANDLING...');
      console.log('='.repeat(60) + '\n');
    }
    
    console.log('Closing modal and saving application...');
    await randomWait(page);
    
    // Close modal and save
    const closeBtn = await page.$('button.artdeco-modal__dismiss');
    if (closeBtn) {
      await closeBtn.click();
      await randomWait(page);
      
      const saveBtn = await page.$('button:has-text("Save")');
      if (saveBtn) {
        console.log('Saving application due to validation error');
        await saveBtn.click();
        await randomWait(page);
      }
    }
  } catch (error) {
    console.log('Error in validation error handler, continuing...');
  }
}

async function uncheckFollowCompany(page) {
  const followCheckbox = await page.$('#follow-company-checkbox');
  if (followCheckbox) {
    const isChecked = await followCheckbox.isChecked();
    if (isChecked) {
      console.log('Unchecking follow company checkbox');
      const label = await page.$('label[for="follow-company-checkbox"]');
      if (label) {
        await label.click();
      } else {
        await followCheckbox.uncheck();
      }
    }
  }
}

async function fillFormFields(page, applicationData) {
  // Fill text inputs (broader selector to catch all text inputs)
  const textInputs = await page.$$('input.artdeco-text-input--input');
  console.log(`DEBUG: Found ${textInputs.length} text inputs`);
  for (const input of textInputs) {
    await fillTextInput(page, input);
  }

  // Fill dropdowns (broader selector to catch all dropdowns)
  const dropdowns = await page.$$('select');
  console.log(`DEBUG: Found ${dropdowns.length} dropdowns`);
  for (let i = 0; i < dropdowns.length; i++) {
    console.log(`DEBUG: Processing dropdown ${i + 1}`);
    await fillDropdown(page, dropdowns[i]);
  }

  // Fill radio buttons
  await fillRadioButtons(page);
  
  // Fill custom questions
  await fillCustomQuestions(page);
  
  // Check for validation errors
  const errorElements = await page.$$('.artdeco-inline-feedback--error');
  if (errorElements.length > 0) {
    console.log('Validation errors detected, logging and saving application');
    throw new Error('VALIDATION_ERROR');
  }
}

async function fillTextInput(page, input) {
  const value = await input.inputValue();
  if (value) {
    console.log('Input already filled, skipping');
    return;
  }

  const label = await getInputLabel(page, input);
  console.log(`DEBUG: Text input label: "${label}"`);
  const fillValue = getAnswerForLabel(label, page);
  console.log(`DEBUG: Text input answer: ${fillValue}`);

  if (fillValue !== null && fillValue !== undefined) {
    const stringValue = fillValue.toString();
    console.log(`Filling text input "${label}" with: ${stringValue}`);
    await input.fill(stringValue);
    await randomWait(page);
  } else {
    console.log(`No answer found for text input "${label}"`);
    // Log as custom question if no answer found
    const url = page.url();
    const lowerLabel = label.toLowerCase();
    
    // Check if it's a duration question
    if (lowerLabel.includes('how many years')) {
      logDurationQuestion(url, label);
    } else {
      // Log all other unanswered questions
      const answerType = lowerLabel.includes('years') ? 'number' : 'text';
      logCustomQuestion(url, label, answerType);
    }
  }
}

async function fillDropdown(page, dropdown) {
  const selectedValue = await dropdown.inputValue();
  if (selectedValue && selectedValue !== 'Select an option') {
    console.log('Dropdown already selected, skipping');
    return;
  }

  const label = await getDropdownLabel(page, dropdown);
  console.log(`DEBUG: Dropdown label: "${label}"`);
  const fillValue = getAnswerForLabel(label, page);
  console.log(`DEBUG: Dropdown answer: ${fillValue}`);
  
  console.log(`Dropdown label: "${label}", looking for value: "${fillValue}"`);

  if (fillValue !== null && fillValue !== undefined) {
    const options = await dropdown.$$('option');
    let found = false;
    
    // For boolean values, try multiple formats
    let searchValues = [];
    if (typeof fillValue === 'boolean') {
      if (fillValue) {
        searchValues = ['Yes', 'True', 'true', '1'];
      } else {
        searchValues = ['No', 'False', 'false', '0'];
      }
    } else {
      searchValues = [fillValue.toString()];
    }
    
    console.log(`DEBUG: Searching dropdown for: ${searchValues.join(', ')}`);
    
    for (const option of options) {
      const optionText = await option.textContent();
      const optionValue = await option.getAttribute('value');
      
      // Try each search value
      for (const searchValue of searchValues) {
        if (optionText?.toLowerCase().includes(searchValue.toLowerCase()) || 
            optionValue?.toLowerCase().includes(searchValue.toLowerCase()) ||
            optionText?.toLowerCase() === searchValue.toLowerCase() ||
            optionValue?.toLowerCase() === searchValue.toLowerCase()) {
          console.log(`Selecting dropdown "${label}" option: ${optionText}`);
          await dropdown.selectOption(optionValue);
          await randomWait(page);
          found = true;
          break;
        }
      }
      if (found) break;
    }
    
    if (!found) {
      console.log(`No matching option found for "${fillValue}" in dropdown "${label}"`);
      
      // Log as custom question if no match found and it looks like a question
      if (label.includes('?')) {
        const url = page.url();
        
        // Get dropdown options for logging
        const options = await dropdown.$$('option');
        const optionTexts = [];
        for (const option of options) {
          const optionText = await option.textContent();
          const optionValue = await option.getAttribute('value');
          if (optionText && optionText !== 'Select an option') {
            optionTexts.push({ text: optionText.trim(), value: optionValue });
          }
        }
        
        logCustomQuestion(url, label, 'dropdown', optionTexts);
      }
    }
  } else {
    console.log(`No answer found for dropdown "${label}"`);
    // Log as custom question if it looks like a question
    if (label.includes('?')) {
      const url = page.url();
      
      // Get dropdown options for logging
      const options = await dropdown.$$('option');
      const optionTexts = [];
      for (const option of options) {
        const optionText = await option.textContent();
        const optionValue = await option.getAttribute('value');
        if (optionText && optionText !== 'Select an option') {
          optionTexts.push({ text: optionText.trim(), value: optionValue });
        }
      }
      
      logCustomQuestion(url, label, 'dropdown', optionTexts);
    }
  }
}

async function fillRadioButtons(page) {
  console.log('DEBUG: Starting radio button fill');
  const fieldsets = await page.$$('fieldset[data-test-form-builder-radio-button-form-component="true"]');
  console.log(`DEBUG: Found ${fieldsets.length} fieldsets`);
  
  for (const fieldset of fieldsets) {
    const legend = await fieldset.$('legend span');
    if (!legend) {
      console.log('DEBUG: No legend span found');
      continue;
    }
    
    const questionText = await legend.textContent();
    console.log(`DEBUG: Question: "${questionText.trim()}"`);
    const answer = getAnswerForLabel(questionText, page);
    console.log(`DEBUG: Answer: ${answer} (${typeof answer})`);
    
    if (typeof answer === 'boolean') {
      const targetValue = answer ? 'Yes' : 'No';
      console.log(`DEBUG: Looking for: ${targetValue}`);
      
      try {
        const radioButton = await fieldset.$(`input[type="radio"][value="${targetValue}"]`);
        if (radioButton) {
          console.log('DEBUG: Radio button found, trying label click...');
          const radioId = await radioButton.getAttribute('id');
          const label = await fieldset.$(`label[for="${radioId}"]`);
          if (label) {
            await Promise.race([
              label.click(),
              page.waitForTimeout(2000)
            ]);
            console.log(`Selected radio button with: ${targetValue}`);
          } else {
            console.log('DEBUG: Label not found, trying direct click');
            await Promise.race([
              radioButton.click(),
              page.waitForTimeout(2000)
            ]);
          }
          await randomWait(page);
        } else {
          console.log('DEBUG: Radio button not found');
        }
      } catch (error) {
        console.log(`DEBUG: Error: ${error.message}`);
      }
    }
  }
}

async function getInputLabel(page, input) {
  const inputId = await input.getAttribute('id');
  if (inputId) {
    const label = await page.$(`label[for="${inputId}"]`);
    if (label) {
      const text = await label.textContent();
      return text.replace(/\s+/g, ' ').trim();
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
      const cleanText = text.replace(/\s+/g, ' ').trim();
      
      // Check for pattern like "text? text?" or "text text"
      const regex = /^(.+?)\?\s*\1\?*$/;
      const match = cleanText.match(regex);
      if (match) {
        return match[1].trim() + '?';
      }
      
      // Fallback: check if first half equals second half
      const words = cleanText.split(' ');
      if (words.length > 2 && words.length % 2 === 0) {
        const halfLength = words.length / 2;
        const firstHalf = words.slice(0, halfLength).join(' ');
        const secondHalf = words.slice(halfLength).join(' ');
        if (firstHalf === secondHalf) {
          return firstHalf;
        }
      }
      
      return cleanText;
    }
  }
  return '';
}

import customQuestions from '../data/customQuestions.json' with { type: 'json' };
import durationQuestions from '../data/durationQuestions.json' with { type: 'json' };
import { logCustomQuestion, logDurationQuestion } from '../utils/logger.js';

async function fillCustomQuestions(page) {
  // Handle dropdowns that might be custom questions
  const customDropdowns = await page.$$('select:not(.fb-dash-form-element__select-dropdown)');
  for (const dropdown of customDropdowns) {
    await fillCustomDropdown(page, dropdown);
  }
  
  // Handle number inputs that might be custom questions
  const numberInputs = await page.$$('input[type="number"]:not(.artdeco-text-input--input)');
  for (const input of numberInputs) {
    await fillCustomNumberInput(page, input);
  }
}

async function fillCustomDropdown(page, dropdown) {
  const selectedValue = await dropdown.inputValue();
  if (selectedValue && selectedValue !== 'Select an option') {
    return;
  }

  const label = await getDropdownLabel(page, dropdown);
  if (!label) return;
  
  const answer = getCustomAnswer(label);
  
  if (answer !== null) {
    const options = await dropdown.$$('option');
    for (const option of options) {
      const optionText = await option.textContent();
      const optionValue = await option.getAttribute('value');
      
      if (optionText?.toLowerCase().includes(answer.toLowerCase()) || 
          optionValue?.toLowerCase().includes(answer.toLowerCase())) {
        console.log(`Selecting custom dropdown "${label}" option: ${optionText}`);
        await dropdown.selectOption(optionValue);
        await randomWait(page);
        break;
      }
    }
  } else {
    // Log as custom question
    const url = page.url();
    
    // Get dropdown options for logging
    const options = await dropdown.$$('option');
    const optionTexts = [];
    for (const option of options) {
      const optionText = await option.textContent();
      const optionValue = await option.getAttribute('value');
      if (optionText && optionText !== 'Select an option') {
        optionTexts.push({ text: optionText.trim(), value: optionValue });
      }
    }
    
    logCustomQuestion(url, label, 'dropdown', optionTexts);
  }
}

async function fillCustomNumberInput(page, input) {
  const value = await input.inputValue();
  if (value) return;

  const label = await getInputLabel(page, input);
  if (!label) return;
  
  const answer = getCustomAnswer(label);
  
  if (answer !== null) {
    console.log(`Filling custom number input "${label}" with: ${answer}`);
    await input.fill(answer.toString());
    await randomWait(page);
  } else {
    // Log as custom question
    const url = page.url();
    logCustomQuestion(url, label, 'number');
  }
}

function getCustomAnswer(questionText) {
  const cleanQuestion = questionText.replace(/\s+/g, ' ').trim();
  
  // Check custom questions for exact match first
  let question = customQuestions.find(q => q.question === cleanQuestion);
  
  // If no exact match in custom questions, check duration questions
  if (!question) {
    question = durationQuestions.find(q => q.question === cleanQuestion);
  }
  
  // If still no exact match, try partial matching in both files
  if (!question) {
    question = customQuestions.find(q => 
      q.question.toLowerCase().includes(cleanQuestion.toLowerCase()) ||
      cleanQuestion.toLowerCase().includes(q.question.toLowerCase())
    );
  }
  
  if (!question) {
    question = durationQuestions.find(q => 
      q.question.toLowerCase().includes(cleanQuestion.toLowerCase()) ||
      cleanQuestion.toLowerCase().includes(q.question.toLowerCase())
    );
  }
  
  if (question && question.answer !== null) {
    return question.answer.toString();
  }
  return null;
}

function getAnswerForLabel(label, page = null) {
  if (!label) return null;

  const cleanLabel = label.replace(/\s+/g, ' ').trim();
  const lowerLabel = cleanLabel.toLowerCase();
  console.log(`DEBUG: Processing label: "${cleanLabel}"`);
  console.log(`DEBUG: Lower label: "${lowerLabel}"`);





  // Check custom questions (highest priority)
  console.log(`DEBUG: Checking custom questions`);
  const customAnswer = getCustomAnswer(cleanLabel);
  console.log(`DEBUG: Custom answer: ${customAnswer}`);
  if (customAnswer !== null) {
    return customAnswer;
  }

  // Check for duration questions ("How many years" patterns)
  console.log(`DEBUG: Checking duration questions`);
  if (lowerLabel.includes('how many years')) {
    console.log(`DEBUG: Found duration question pattern`);
    // Log as duration question for manual completion
    if (page) {
      const url = page.url();
      logDurationQuestion(url, cleanLabel);
    }
    return null; // Let it fall through to logging
  }

  console.log(`DEBUG: No answer found for: "${cleanLabel}"`);
  return null;
}



export async function applyToJob(page, applicationData) {
  console.log('Pretending to upload resume:', applicationData.resumePath);
  console.log('Application submitted for dummy job!');
}