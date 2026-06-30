const sleep = require("./sleep");

async function retry(fn, times = 3, delay = 500) {
  let lastErr;

  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await sleep(delay * Math.pow(2, i));
    }
  }

  throw lastErr;
}

module.exports = retry;
