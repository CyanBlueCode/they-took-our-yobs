import fs from 'fs';
import path from 'path';

export function logFailure(jobData, error) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    jobId: jobData.jobId,
    url: jobData.url,
    error,
    timestamp
  };
  
  const logPath = path.join(process.cwd(), 'failed-applications.json');
  let logs = [];
  
  if (fs.existsSync(logPath)) {
    logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  }
  
  logs.push(logEntry);
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
  console.log(`Logged failure for job ${jobData.jobId}`);
}

export function logCustomQuestion(jobData, questionText, answerType) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    jobId: jobData.jobId,
    url: jobData.url,
    question: questionText.replace(/\s+/g, ' ').trim(),
    answerType,
    answer: null,
    timestamp
  };
  
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
