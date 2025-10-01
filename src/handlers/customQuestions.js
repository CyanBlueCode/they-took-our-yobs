// src/handlers/customQuestion.js
const logger = require('../utils/logger');

async function handleCustomQuestion(label, page, answers, keywords) {
  // crude keyword-based fallback logic
  if (label.toLowerCase().includes("years")) {
    const input = await page.$('input[type="number"]');
    if (input) {
      await input.fill("5"); // fallback default
      return true;
    }
  }

  if (label.toLowerCase().includes("authorized")) {
    const yes = await page.$('input[value="yes"]');
    if (yes) {
      await yes.click();
      return true;
    }
  }

  // If nothing matched, log and bail
  logger.logCustomQuestion(label);
  return false;
}

module.exports = { handleCustomQuestion };
