// src/handlers/chipHandlers.js
const chipHandlers = {
  "experience-years": async (page, qElement, label, answers, keywords) => {
    // extract keyword variable from label
    const text = await qElement.innerText();
    const matchedTech = Object.keys(keywords.tech).find(key =>
      keywords.tech[key].some(alias => text.toLowerCase().includes(alias))
    );

    const years = matchedTech ? answers.experienceYears[matchedTech] : null;
    if (years !== null) {
      const input = await qElement.$('input[type="number"]');
      await input.fill(String(years));
    }
  },

  "work-authorization": async (page, qElement, label, answers) => {
    const answer = answers.boolean["work-authorization"];
    const selector = answer ? 'input[value="yes"]' : 'input[value="no"]';
    await qElement.$(selector).then(el => el.click());
  }
};

module.exports = { chipHandlers };
