import config from '../data/config.json' with { type: 'json' };

export function getRandomTimeout() {
  const { minMs, maxMs } = config.randomTimeout;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

export async function randomWait(page) {
  const timeout = getRandomTimeout();
  await page.waitForTimeout(timeout);
}