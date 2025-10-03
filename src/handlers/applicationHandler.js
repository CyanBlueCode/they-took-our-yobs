export async function processEasyApplyModal(page, applicationData) {
  const maxSteps = 12;
  let currentStep = 0;

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
    } else {
      console.log('No next/submit button found - ending modal process');
      break;
    }
  }
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
  
  if (fillValue) {
    const options = await dropdown.$$('option');
    for (const option of options) {
      const optionText = await option.textContent();
      const optionValue = await option.getAttribute('value');
      
      if (optionText?.includes(fillValue) || optionValue?.includes(fillValue)) {
        console.log(`Selecting dropdown "${label}" option: ${optionText}`);
        await dropdown.selectOption(optionValue);
        await page.waitForTimeout(500);
        break;
      }
    }
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
      return await label.textContent();
    }
  }
  return '';
}

function getAnswerForLabel(label, applicationData) {
  if (!label) return null;
  
  const lowerLabel = label.toLowerCase();
  
  // Phone number
  if (lowerLabel.includes('phone') || lowerLabel.includes('mobile')) {
    return applicationData.phone;
  }
  
  // Email
  if (lowerLabel.includes('email')) {
    return applicationData.email;
  }
  
  // Full name
  if (lowerLabel.includes('name') && (lowerLabel.includes('full') || lowerLabel.includes('first') || lowerLabel.includes('last'))) {
    return applicationData.fullName;
  }
  
  // Work authorization
  if (lowerLabel.includes('work') && lowerLabel.includes('author')) {
    return applicationData.workAuth;
  }
  
  // Relocation
  if (lowerLabel.includes('relocat')) {
    return applicationData.relocation;
  }
  
  // Salary
  if (lowerLabel.includes('salary') || lowerLabel.includes('compensation')) {
    return applicationData.salaryExpectation;
  }
  
  return null;
}

export async function applyToJob(page, applicationData) {
  console.log("Pretending to upload resume:", applicationData.resumePath);
  console.log("Application submitted for dummy job!");
}
