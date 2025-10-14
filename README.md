# **LinkedIn Easy Apply Automation – Project Overview**

### **Goal**

Automate the repetitive LinkedIn Easy Apply process for filtered job search results. The tool should:

* Navigate the job list and handle pagination.
* Detect “Easy Apply” listings and open modals.
* Fill out Easy Apply forms using structured data (JSON).
* Skip prefilled fields where possible.
* Uncheck default checkboxes like “Follow company”.
* Submit applications automatically (or optionally discard for testing).
* Log failures for manual review and re-run.

**Scope:**

* Temporary, personal-use automation for efficiency; not an enterprise-grade solution.
* Focus on jobs with “Easy Apply” only.
* Authentication handled manually + persistent session via Playwright storage state.
* No heavy AI or fuzzy NLP needed — mostly exact or partial keyword matching.


**NOTES:**
* Never use REMEMBER ME for login; repeat use triggers LinkedIn throttler/potential bot detection

---

# **Project Architecture & Dir Structure**

```
project-root/
│
├─ data/
│   ├─ answers.json           # Predefined answers keyed by keyword variables
│   ├─ application.json       # Maps questions to answer types + keywords
│   ├─ config.json            # Settings: polling interval, max modal steps, etc.
│   ├─ keywords.json          # Arrays for partial-match keyword categories (tech, duration, etc.)
│   └─ questions.json         # Static question patterns for Easy Apply forms
│
├─ handlers/
│   ├─ applicationHandler.js  # Central logic for mapping questions → answers
│   ├─ chipHandlers.js        # Handles pre-defined LinkedIn “chip” options
│   └─ customQuestions.js     # Handles any poster-provided custom questions
│
├─ scripts/
│   ├─ run.js                 # Main entry point; calls navigation + handlers
│   └─ save-auth.js           # Generates and saves storageState.json for persistent login
│
├─ utils/
│   ├─ logger.js              # Logs failed job applications (JobId, URL, timestamp)
│   └─ selectors.js           # Centralized DOM selectors (e.g., Easy Apply button, Next, Submit)
│
├─ navigation.js              # Core logic: loops job cards, opens modal, iterates through form pages
├─ index.js                   # Optional higher-level orchestrator
├─ playwright.config.js       # Playwright settings: browser type, viewport, headless, timeouts
├─ storageState.json          # Saved session for persistent login
├─ package.json
└─ README.md
```

---

# **Key Decisions & Notes**

### 1. **Authentication**

* Manual login for first run, then persistent via Playwright `storageState.json`.
* Hot reload during development supported via `nodemon` without re-login.

### 2. **Job Card Navigation**

* Iterate through `<li data-occludable-job-id>` elements.
* Lazy loading handled by scrolling parent container (via scrollIntoView).
* Pagination handled by detecting `button[aria-label="Next"]`.

### 3. **Easy Apply Modal Handling**

* Detect modal via Easy Apply button inside job card.
* Discard draft if modal was previously interacted with.
* First-page checkbox “Follow company” is always unchecked.
* Modal pages looped up to `maxSteps = 12`.

### 4. **Form Filling**

* **Input types supported:**

  * Text inputs (`input[type="text"]`)
  * Dropdown selects (`select`)
  * Checkboxes (specific first-page checkbox)
  * Other field types TBD
* **Prefilled detection:**

  * Skip if input has value or dropdown selection isn't blank.
* **Answer mapping:**

  * `applicationHandler.js` maps label → keyword → JSON value.
  * Uses substring matching for tech names, durations, and other common categories.
  * Custom questions logged for manual completion.
* **Navigation buttons:**

  * Detect `Next` or `Submit` dynamically.

### 5. **Data Flow**

* `questions.json` → static question templates (predefined LinkedIn chips).
* `keywords.json` → partial-match lists for dumber JS matching.
* `application.json` → maps questions + keyword → answer type + placeholder.
* `answers.json` → actual answer values.
* Handlers fetch answers dynamically, fill fields, log failures.

### 6. **Logging & Error Handling**

* All failures: JobId + URL + timestamp stored in logger for rerun.
* Any unexpected field triggers discard modal, logs job, and continues on to next job listing/application.

### 7. **Timing & Anti-Bot**

* Small randomized delays for clicks/fills to simulate human behavior.
* Adjustable polling/retry per hour to reduce detection risk.

### 8. **Development Notes**

* Playwright “headed” mode.
* Hot reload via `nodemon` → edits reflected without login.
* All selectors centralized in `selectors.js` for easy updates when LinkedIn changes DOM.
* No Cypress or Jest; this is purely Playwright-based.

# **Key Takeaways**

* **Minimal viable automation:** fill only known fields, skip prefilled, discard/submit appropriately.
* **Data-driven:** JSON structure controls what is filled, easy to extend.
* **Robust error handling:** logs everything for manual follow-up.
* **Temporary & flexible:** persistent login + hot reload avoids repeated auth headaches.
* **KISS principle:** simple substring matching for keywords, not ML or LLM-based.
* **Limited LinkedIn questions:** there are only 20 pre-set questions the job poster can set when posting a job, by clicking on Screening Questions categorical chips in the job posting process + 1 custom question which only; some of the defined .
*/

# **Setup**
1. `npx playwright install`
2. `npm i`
3. install plugin "Playwright Test for VSCode" @id:ms-playwright.playwright (optional)

# **Usage**
1. `npm run dev`
2. go to Chromium window
3. login to LinkedIn; do NOT check Remember Me
4. go back to console, hit ENTER; save-auth.js will generate a storageState.json to store credentials then close browser window
5. once browser reopens, pull up job search page with all desired criteria
5. go back to console, hit ENTER again to start Nodemon run.js
6. follow console prompts


---
# **Screening Questions**
NOTES:
- Brackets indicate [variable] value (variable values will be populated and stored in keywords.json later)
- ">" indicates answer to the question in line above; questions with variables will have different answers depending on variable
- Custom Question is special--it can be any custom question, but the answer must be boolean or numerical
- Ignore/skip/omit everything in #Skip section; irrelevant questions for our use for now
- 

# Boolean
Have you completed the following level of education: [Degree]?
How many years of [Job_Function] experience do you currently have?
Are you willing to undergo a background check, in accordance with local law/regulations?
> yes
Do you have a valid driver's license?
> yes
Are you willing to take a drug test, in accordance with local law/regulations?
> yes
Are you comfortable commuting to this job's location?
> no
Are you comfortable working in an onsite setting?
> no
Are you comfortable working in a hybrid setting?
> yes
Are you comfortable working in a remote setting?
> yes
We must fill this position urgently. Can you start immediately?
> yes
Will you now, or in the future, require sponsorship for employment visa status (e.g. H-1B visa status)?
> no
Are you legally authorized to work in the United States?
> yes

# Number
How many years of work experience do you have with [Skill/Tech]?
How many years of [Industry] experience do you currently have?

# Boolean/Number
[Custom Question; answer type can only be: yes/no or numeric]

# Skip
What is your level of proficiency in [Language]?
What is your university grade point average (4.0 GPA Scale)?
Do you have the following license or certification: [License/Certification]?
