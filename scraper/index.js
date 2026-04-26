const { chromium } = require("playwright");
const { randomDelay } = require("./utils/delays");
const { getRandomUserAgent } = require("./utils/userAgents");
const { checkWebsiteType } = require("./utils/websiteChecker");
const { normalizeScrapedWebsiteUrl } = require("../lib/websiteUrl");
const {
  saveBusiness,
  exportToCSV,
  updateSingleCitySummary,
} = require("../firebase");
const config = require("../config");
const { initializeApp, cert } = require("firebase-admin/app");
const {
  getFirestore,
  FieldValue,
  Timestamp,
  addDoc,
} = require("firebase-admin/firestore");
const { adminDb } = require("../firebase/adminApp");

/**
 * Main scraper function
 * @param {Object} options - Scraper options
 * @returns {Promise<Array>} - Array of scraped businesses
 */
async function scrapeGoogleMaps(options = {}) {
  // Merge default options with provided options
  const settings = {
    ...config.defaultSettings,
    ...options,
  };

  console.log(
    `Starting Google Maps scraper for "${settings.businessType}" in "${settings.city}"`
  );
  console.log(`Max results: ${settings.maxResults}`);

  const headless =
    process.env.PLAYWRIGHT_HEADLESS === "1" ||
    process.env.PLAYWRIGHT_HEADLESS === "true";
  console.log(
    `Launching Chromium (headless=${headless})… If this hangs, run: npx playwright install chromium`
  );

  const browser = await chromium.launch({
    headless,
    args: ["--lang=en-US"], // Force browser language
  });

  const userAgent = getRandomUserAgent();
  console.log(`Using user agent: ${userAgent}`);

  const context = await browser.newContext({
    userAgent,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    locale: "en-US", // Force English locale
    extraHTTPHeaders: {
      // Send English language header
      "accept-language": "en-US,en;q=0.9",
    },
  });

  const page = await context.newPage();
  const scrapedBusinesses = [];
  let exportedData = null;

  try {
    // Navigate to Google Maps
    await page.goto("https://www.google.com/maps?hl=en");

    // Accept cookies if the dialog appears
    try {
      const acceptButton = await page.waitForSelector(
        'button:has-text("Accept all")',
        { timeout: 5000 }
      );
      if (acceptButton) {
        await acceptButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // Cookie dialog might not appear, continue
      console.log("No cookie dialog or already accepted");
    }

    // Search for businesses
    const searchQuery = `${settings.businessType} near ${settings.city}`;
    await page.fill('input[name="q"]', searchQuery);
    await page.press('input[name="q"]', "Enter");

    // Wait for results to load (NEEDS SUFFICIENT TIME!)
    await page.waitForSelector('div[role="feed"]', { timeout: 15000 }); // Increased timeout back to 15s
    await randomDelay(2000, 4000);

    // Scroll to load more results
    const resultsFeed = await page.$('div[role="feed"]');
    let previousResultsCount = 0;
    let currentResultsCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 50; // Limit scrolling attempts

    console.log("Scrolling to load more results...");

    while (
      // Stop scrolling once enough results are LOADED
      currentResultsCount < settings.maxResults &&
      scrollAttempts < maxScrollAttempts &&
      // Ensure scrolling continues if few attempts made or if new results are still loading
      (currentResultsCount > previousResultsCount || scrollAttempts < 5)
    ) {
      previousResultsCount = currentResultsCount;

      // Scroll the results feed
      await resultsFeed.evaluate((feed) => {
        feed.scrollTop = feed.scrollHeight;
      });

      // Wait for new results to load
      await randomDelay(1000, 3000);

      // Count current results
      const resultItems = await page.$$('div[role="feed"] > div');
      currentResultsCount = resultItems.length;

      console.log(`Loaded ${currentResultsCount} results so far...`);
      scrollAttempts++;
    }

    // --- Get a locator for the PARENT FEED DIV ---
    const feedLocator = page.locator('div[role="feed"]');
    console.log("Results feed located. Processing items...");

    // --- Process each result (up to maxResults) ---
    const maxToProcess = settings.maxResults;
    let resultsProcessedInFeed = 0; // list row index
    let continueProcessing = true;

    while (scrapedBusinesses.length < maxToProcess && continueProcessing) {
      const currentResultDivs = feedLocator.locator("> div");
      let countOnPage = await currentResultDivs.count();

      // Load more list rows in the same search (infinite scroll) before giving up
      let scrollTries = 0;
      while (resultsProcessedInFeed >= countOnPage && continueProcessing) {
        const before = countOnPage;
        const feedEl = await page.$('div[role="feed"]');
        if (feedEl) {
          await feedEl.evaluate((feed) => {
            feed.scrollTop = feed.scrollHeight;
          });
        }
        await randomDelay(2000, 3500);
        countOnPage = await currentResultDivs.count();
        scrollTries += 1;
        console.log(
          `After scroll: ${countOnPage} feed rows (need index ${resultsProcessedInFeed}), try ${scrollTries}`
        );
        if (countOnPage > before) break;
        if (scrollTries >= 4) {
          console.log("No new rows after scrolling; no more map results to load.");
          continueProcessing = false;
          break;
        }
      }
      if (!continueProcessing) break;
      if (resultsProcessedInFeed >= countOnPage) {
        continueProcessing = false;
        break;
      }

      // Must be on the search results list, not a place detail URL from last visit
      await returnToSearchResultsList(page);

      const resultDivLocator = currentResultDivs.nth(resultsProcessedInFeed);
      const itemIndexForLog = resultsProcessedInFeed + 1;

      try {
        console.log(
          `Processing result ${itemIndexForLog} (saved ${scrapedBusinesses.length}/${maxToProcess}, ${countOnPage} in feed)...`
        );

        await resultDivLocator
          .scrollIntoViewIfNeeded()
          .catch(() => {});

        let clickSuccessful = false;
        const potentialClickTargets = [
          resultDivLocator.locator("a.hfpxzc").first(),
          resultDivLocator,
        ];
        const initialUrl = page.url();

        for (const targetLocator of potentialClickTargets) {
          try {
            await targetLocator.waitFor({ state: "visible", timeout: 5000 });
            await targetLocator.click({ timeout: 5000 });

            await page.waitForFunction(
              (initial) =>
                window.location.href !== initial &&
                window.location.href.includes("/maps/place/"),
              initialUrl,
              { timeout: 10000 }
            );
            await page
              .locator('button[data-item-id="address"]')
              .first()
              .waitFor({ state: "visible", timeout: 10000 });

            clickSuccessful = true;
            console.log("Click and navigation successful.");
            break;
          } catch (clickError) {
            // try next target
          }
        }

        if (!clickSuccessful) {
          console.log(
            `Failed to click and navigate for result ${itemIndexForLog}. Skipping.`
          );
        } else {
          try {
            await page
              .locator("h1")
              .first()
              .waitFor({ state: "visible", timeout: 5000 });
            console.log("Key details panel elements visible.");
          } catch (waitError) {
            console.log(
              `Timeout waiting for H1 after navigation for result ${itemIndexForLog}. Skipping.`
            );
            resultsProcessedInFeed += 1;
            await randomDelay(500, 1000);
            continue;
          }

          const businessData = await extractBusinessData(page, settings);

          if (businessData) {
            const saveResult = await saveBusiness(businessData);
            if (saveResult.success) {
              scrapedBusinesses.push(businessData);
              console.log(
                `Saved business #${scrapedBusinesses.length}: ${businessData.name}`
              );
            } else if (saveResult.reason === "duplicate") {
              console.log(`Skipped duplicate business: ${businessData.name}`);
            }
          }

          await randomDelay(settings.minDelay, settings.maxDelay);
        }
      } catch (error) {
        console.error(`Error processing result ${itemIndexForLog}:`, error);
        await randomDelay(1000, 2000);
      } finally {
        await returnToSearchResultsList(page);
      }

      resultsProcessedInFeed += 1;
    } // End of while loop

    console.log(
      `Finished processing loop. Successfully scraped ${scrapedBusinesses.length} businesses.`
    );

    // Export to CSV if requested
    if (settings.exportCsv && scrapedBusinesses.length > 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `google_maps_${settings.businessType}_${settings.city}_${timestamp}.csv`;
      exportedData = await exportToCSV(scrapedBusinesses, filename);
    }

    // Update city summary
    await updateSingleCitySummary(settings.city);

    // Return results
    return {
      businesses: scrapedBusinesses,
      total: scrapedBusinesses.length,
      exportedCsv: exportedData,
    };
  } catch (error) {
    console.error(`Scraper error for ${settings.city}:`, error);
    return {
      businesses: scrapedBusinesses,
      total: scrapedBusinesses.length,
      exportedCsv: null,
      error: error.message,
    };
  } finally {
    // Close browser
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Extract business data from the details panel
 * @param {Page} page - Playwright page object
 * @param {Object} settings - Scraper settings
 * @returns {Object|null} - Business data or null if extraction failed
 */
async function extractBusinessData(page, settings) {
  console.log("\n--- Starting Data Extraction --- ");
  try {
    // // NAME: Get the business name reliably from H1
    // console.log("Attempting to extract: NAME");
    // const nameLocator = page.locator("h1").first();
    // await nameLocator.waitFor({ state: "visible", timeout: 10000 }); // Ensure H1 is loaded
    // await page.waitForTimeout(500); // <<<< ADDED SMALL DELAY >>>>
    // const name = await nameLocator.innerText();
    // console.log(`  [Name] Found: '${name}'`);

    // // Check for invalid names more robustly
    // if (
    //   !name ||
    //   name.trim() === "" ||
    //   name.toLowerCase().includes("results for") ||
    //   name === "Резултати"
    // ) {
    //   console.log(
    //     `  [Name] Invalid name detected ('${name}'). Skipping extraction.`
    //   );
    //   return null;
    // }

    const mapsLink = page.url(); // Get URL after confirming valid details page
    console.log(`  [Link] Maps Link: ${mapsLink}`);

    // Initialize data object
    let businessDetails = {
      name: null,
      maps_link: mapsLink,
      city: settings.city,
      business_type: settings.businessType,
      scraped_at: new Date().toISOString(),
      category: settings.businessType, // <<<< Hardcode category from input >>>>
      address: null,
      phone: null,
      website: null,
      website_status: "none",
      rating: null,
      reviews: null,
      imageUrl: null,
    };

    // --- Extract other details with individual waits and try/catch ---

    // CATEGORY - REMOVED SCRAPING LOGIC
    console.log(`Using hardcoded CATEGORY: '${businessDetails.category}'`);

    // NAME
    console.log("Attempting to extract: NAME");
    try {
      const nameLocator = page.locator(".DUwDvf").first();
      console.log("Name locator:", nameLocator);
      await nameLocator.waitFor({ state: "visible", timeout: 5000 });
      businessDetails.name = await nameLocator.innerText();
      console.log(`  [Name] Found: '${businessDetails.name}'`);
    } catch (e) {
      console.log("  [Name] Selector failed.");
    }

    // ADDRESS
    console.log("Attempting to extract: ADDRESS");
    try {
      const addressLocator = page
        .locator('button[data-item-id="address"] div[class*="fontBodyMedium"]')
        .first();
      console.log("Address locator:", addressLocator);
      await addressLocator.waitFor({ state: "visible", timeout: 5000 });
      businessDetails.address = await addressLocator.innerText();
      console.log(`  [Address] Found: '${businessDetails.address}'`);
    } catch (e) {
      console.log("  [Address] Selector failed.");
    }

    // PHONE
    console.log("Attempting to extract: PHONE");
    try {
      const phoneLocator = page
        .locator('button[data-item-id^="phone"] div[class*="fontBodyMedium"]')
        .first();
      await phoneLocator.waitFor({ state: "visible", timeout: 5000 });
      businessDetails.phone = await phoneLocator.innerText();
      console.log(`  [Phone] Found: '${businessDetails.phone}'`);
    } catch (e) {
      console.log("  [Phone] Selector failed.");
    }

    // WEBSITE
    console.log("Attempting to extract: WEBSITE");
    try {
      const websiteLocator = page
        .locator('a[data-item-id="authority"]')
        .first();
      await websiteLocator.waitFor({ state: "visible", timeout: 5000 });
      const rawWebsiteHref = await websiteLocator.getAttribute("href");
      businessDetails.website = normalizeScrapedWebsiteUrl(rawWebsiteHref) || null;
      console.log(`  [Website] Found (raw): '${rawWebsiteHref}' → ${businessDetails.website || "null"}`);
    } catch (e) {
      console.log("  [Website] Link selector failed. Trying text button...");
      // Check for "Add website" button or plain text if link fails
      try {
        const websiteTextLocator = page
          .locator('button[data-item-id="website"]')
          .first();
        await websiteTextLocator.waitFor({ state: "visible", timeout: 2000 });
        const websiteText = await websiteTextLocator.innerText();
        console.log(`  [Website] Found text/button: '${websiteText}'`);
        // Check if it's the placeholder text or an actual domain/path
        if (
          !websiteText.toLowerCase().includes("add website") &&
          !websiteText.toLowerCase().includes("додадете веб-сајт")
        ) {
          businessDetails.website = websiteText;
          console.log(
            `  [Website] Using text as website: '${businessDetails.website}'`
          );
        } else {
          console.log(
            "  [Website] Text was placeholder ('Add website'). Setting website to null."
          );
          businessDetails.website = null; // Explicitly set to null if placeholder
        }
      } catch (e2) {
        console.log("  [Website] Text button selector failed.");
      }
    }
    if (businessDetails.website) {
      const n = normalizeScrapedWebsiteUrl(businessDetails.website);
      if (n) businessDetails.website = n;
    }
    // Update status based on final website value
    businessDetails.website_status = checkWebsiteType(businessDetails.website);
    console.log(`  [Website] Final Status: ${businessDetails.website_status}`);

    // RATING
    console.log("Attempting to extract: RATING");
    try {
      const ratingLocator = page
        .locator('div[role="img"][aria-label*="stars"]')
        .first();
      await ratingLocator.waitFor({ state: "visible", timeout: 5000 });
      const ratingText = await ratingLocator.getAttribute("aria-label");
      const ratingMatch = ratingText?.match(/([0-9.]+) stars?/);
      businessDetails.rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
      console.log(
        `  [Rating] Found: ${businessDetails.rating} (from '${ratingText}')`
      );
    } catch (e) {
      console.log("  [Rating] Selector failed.");
    }

    // REVIEWS
    console.log("Attempting to extract: REVIEWS");
    try {
      // Try a different selector - looking for span with (digits) near stars
      // const reviewsLocator = page
      //   .locator('span[aria-label*="stars"] ~ span:has-text("(")')
      //   .first();
      const reviewsLocator = page.locator(
        'div.F7nice span[aria-label$="reviews"]'
      );
      await reviewsLocator.waitFor({ state: "visible", timeout: 3000 }); // Shorter timeout
      const reviewsText = await reviewsLocator.innerText();
      const reviewsMatch = reviewsText?.match(/\(?([0-9,]+)\)?/); // Extract number from parentheses
      businessDetails.reviews = reviewsMatch
        ? parseInt(reviewsMatch[1].replace(/,/g, ""))
        : null;
      console.log(
        `  [Reviews] Found: ${businessDetails.reviews} (from '${reviewsText}')`
      );
    } catch (e) {
      console.log("  [Reviews] Selector failed.");
    }

    // IMAGE URL (GMaps often uses lh3, lh4, etc.; avoid map UI sprites)
    console.log("Attempting to extract: IMAGE URL");
    const isBusinessPhotoUrl = (src) => {
      if (!src || !src.startsWith("http")) return false;
      if (src.includes("gstatic.com")) return false;
      if (src.includes("/maps/vt/") || src.includes("pin") || src.includes("icons")) {
        return false;
      }
      return src.includes("googleusercontent.com") || src.includes("ggpht.com");
    };
    const imageCandidateSelectors = [
      'button[aria-label^="Photo of"] img',
      'div[role="main"] button img',
      'div[role="main"] button img[data-src], div[role="main"] button img[src*="google"]',
    ];
    let chosen = null;
    try {
      const byLabel = page.getByLabel(/Photo of/i).locator("img").first();
      await byLabel.waitFor({ state: "visible", timeout: 2000 });
      const s = (await byLabel.getAttribute("src")) || (await byLabel.getAttribute("data-src"));
      if (isBusinessPhotoUrl(s)) chosen = s;
    } catch (e) {
      /* */
    }
    for (const sel of imageCandidateSelectors) {
      if (chosen) break;
      try {
        const loc = page.locator(sel).first();
        await loc.waitFor({ state: "visible", timeout: 2000 });
        const src = (await loc.getAttribute("src")) || (await loc.getAttribute("data-src"));
        if (isBusinessPhotoUrl(src)) {
          chosen = src;
          break;
        }
      } catch (e) {
        /* try next */
      }
    }
    if (!chosen) {
      try {
        const all = page.locator('div[role="main"] img');
        const n = await all.count();
        for (let i = 0; i < n && i < 12; i++) {
          const src = await all.nth(i).getAttribute("src");
          if (isBusinessPhotoUrl(src)) {
            chosen = src;
            break;
          }
        }
      } catch (e) {
        /* */
      }
    }
    if (chosen) {
      businessDetails.imageUrl = chosen;
      console.log(
        `  [Image URL] ${chosen.substring(0, Math.min(80, chosen.length))}...`
      );
    } else {
      businessDetails.imageUrl = null;
      console.log("  [Image URL] No suitable photo in panel.");
    }

    console.log("--- Finished Data Extraction ---");
    return businessDetails;
  } catch (error) {
    console.error(`Error extracting business data for ${page.url()}:`, error);
    return null;
  }
}

/**
 * Return from a place page to the search results so the list can be clicked again.
 */
async function returnToSearchResultsList(page) {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!String(page.url()).includes("/maps/place/")) {
      try {
        await page
          .locator('div[role="feed"]')
          .first()
          .waitFor({ state: "visible", timeout: 5000 });
      } catch (e) {
        /* some layouts still have feed */
      }
      return;
    }
    try {
      await page.goBack({ waitUntil: "domcontentloaded", timeout: 20000 });
      await page
        .locator('div[role="feed"]')
        .first()
        .waitFor({ state: "visible", timeout: 15000 });
    } catch (e) {
      console.log("returnToSearchResultsList goBack issue:", e.message);
      return;
    }
  }
  await randomDelay(400, 900);
}

module.exports = {
  scrapeGoogleMaps,
};
