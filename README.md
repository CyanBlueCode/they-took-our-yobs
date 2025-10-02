Setup:
1. `npx playwright install`
2. `npm i`
3. install plugin "Playwright Test for VSCode" @id:ms-playwright.playwright (optional)

Usage:
1. `npm run dev`
2. go to Chromium window
3. login to LinkedIn; do NOT check Remember Me
4. go back to console, hit ENTER; save-auth.js will generate a storageState.json to store credentials then close browser window
5. once browser reopens, pull up job search page with all desired criteria
5. go back to console, hit ENTER again to start Nodemon run.js
6. follow console prompts