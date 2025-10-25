import fs from 'fs';
import path from 'path';

export function logCustomQuestion(url, questionText, answerType, options = null) {
  const timestamp = new Date().toISOString();
  
  // Extract jobId from URL
  const jobIdMatch = url.match(/currentJobId=(\d+)/);
  const jobId = jobIdMatch ? jobIdMatch[1] : 'unknown';
  
  // Clean and deduplicate question text
  let cleanQuestion = questionText.replace(/\s+/g, ' ').trim();
  
  // Remove duplicate text if present - check for pattern like "text? text?"
  const words = cleanQuestion.split(' ');
  const halfLength = Math.floor(words.length / 2);
  const firstHalf = words.slice(0, halfLength).join(' ');
  const secondHalf = words.slice(halfLength).join(' ');
  if (firstHalf === secondHalf && words.length > 1) {
    cleanQuestion = firstHalf;
  }
  
  const logEntry = {
    jobId,
    question: cleanQuestion,
    answerType,
    answer: null,
    timestamp
  };
  
  // Add options for dropdown questions
  if (options && options.length > 0) {
    logEntry.options = options;
  }
  
  const logPath = path.join(process.cwd(), 'src/data/customQuestions.json');
  let logs = [];
  
  if (fs.existsSync(logPath)) {
    logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  }
  
  // Check if question already exists
  const exists = logs.some(entry => entry.question === logEntry.question);
  if (!exists) {
    logs.push(logEntry);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    console.log(`Logged custom question: ${questionText.trim()}`);
  }
}
