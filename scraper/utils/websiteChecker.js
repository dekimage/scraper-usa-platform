/**
 * Check the type of website URL
 * @param {string} url - The website URL to check
 * @returns {string} - Type of website: "none", "facebook/instagram", or "real"
 */
function checkWebsiteType(url) {
  if (!url) {
    return "none"
  }

  // Convert to lowercase for case-insensitive matching
  const lowerUrl = url.toLowerCase()

  // Check if it's a social media site
  if (
    lowerUrl.includes("facebook.com") ||
    lowerUrl.includes("fb.com") ||
    lowerUrl.includes("instagram.com") ||
    lowerUrl.includes("fb.me")
  ) {
    return "facebook/instagram"
  }

  // If it has a domain and isn't social media, it's a real website
  return "real"
}

module.exports = {
  checkWebsiteType,
}
