// Utility functions for adding delays

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after the delay
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate a random delay between min and max milliseconds
 * @param {number} min - Minimum delay in milliseconds
 * @param {number} max - Maximum delay in milliseconds
 * @returns {number} - Random delay in milliseconds
 */
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Wait for a random amount of time between min and max milliseconds
 * @param {number} min - Minimum delay in milliseconds
 * @param {number} max - Maximum delay in milliseconds
 * @returns {Promise} - Promise that resolves after the random delay
 */
async function randomDelay(min, max) {
  const delay = getRandomDelay(min, max)
  console.log(`Waiting for ${(delay / 1000).toFixed(1)} seconds...`)
  return sleep(delay)
}

module.exports = {
  sleep,
  getRandomDelay,
  randomDelay,
}
