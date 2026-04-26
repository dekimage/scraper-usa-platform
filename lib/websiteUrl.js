/**
 * Google Maps "Website" is often a redirect: /url?q=https://... or full google.com/url
 * Relative paths break in React <a href> (treated as same-origin to localhost).
 */
function normalizeScrapedWebsiteUrl(href) {
  if (href == null) return null
  const t = String(href).trim()
  if (!t) return null

  try {
    if (t.startsWith("http://") || t.startsWith("https://")) {
      if (t.includes("google.com/url") || t.includes("google.com/search")) {
        const u = new URL(t)
        const q = u.searchParams.get("q") || u.searchParams.get("url")
        if (q) return safeDecodeUrl(q)
      }
      return t
    }
    if (t.startsWith("/url?") || t.startsWith("/url")) {
      const u = new URL("https://www.google.com" + t)
      const q = u.searchParams.get("q") || u.searchParams.get("url")
      if (q) return safeDecodeUrl(q)
    }
  } catch (e) {
    /* fall through */
  }
  if (t.startsWith("http")) return t
  if (t.includes(".") && !t.startsWith("/") && !t.includes(" ")) {
    return t.startsWith("http") ? t : "https://" + t
  }
  return t
}

function safeDecodeUrl(s) {
  try {
    return decodeURIComponent(s)
  } catch (e) {
    return s
  }
}

module.exports = { normalizeScrapedWebsiteUrl, safeDecodeUrl }
