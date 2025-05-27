const { chromium } = require("playwright");
const { randomDelay } = require("./utils/delays");
const { getRandomUserAgent } = require("./utils/userAgents");
const { checkWebsiteType } = require("./utils/websiteChecker");
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

  const browser = await chromium.launch({
    headless: false, // Set to true for production
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
    let resultsProcessedInFeed = 0; // Track how many we looked at in the feed
    let continueProcessing = true;

    // Loop while we haven't hit max results AND there are potentially more items to check
    while (scrapedBusinesses.length < maxToProcess && continueProcessing) {
      // <<< Re-evaluate the list of result DIVs *inside* the loop >>>
      const currentResultDivs = feedLocator.locator("> div"); // Direct children divs
      const countOnPage = await currentResultDivs.count();

      // Check if we've processed all available items in the current view
      if (resultsProcessedInFeed >= countOnPage) {
        console.log(
          `Processed all ${countOnPage} items currently visible in feed. Stopping.`
        );
        continueProcessing = false; // Exit the while loop
        break;
      }

      // Get the locator for the NEXT item to process based on index
      const resultDivLocator = currentResultDivs.nth(resultsProcessedInFeed);
      const itemIndexForLog = resultsProcessedInFeed + 1;

      try {
        console.log(
          `Processing result ${itemIndexForLog} (Scraped: ${scrapedBusinesses.length}/${maxToProcess})...`
        );

        // --- Robust Click Strategy (using resultDivLocator) ---
        let clickSuccessful = false;
        const potentialClickTargets = [
          resultDivLocator.locator("a.hfpxzc").first(), // Specific link if available
          resultDivLocator, // Fallback to the whole div
        ];
        const initialUrl = page.url();

        for (const targetLocator of potentialClickTargets) {
          try {
            // Check visibility before clicking
            await targetLocator.waitFor({ state: "visible", timeout: 5000 });
            await targetLocator.click({ timeout: 5000 }); // Try clicking

            // More robust wait: Check for URL change *and* address button presence
            await page.waitForFunction(
              (initial) =>
                window.location.href !== initial &&
                window.location.href.includes("/maps/place/"),
              initialUrl,
              { timeout: 7000 }
            );
            await page
              .locator('button[data-item-id="address"]')
              .first()
              .waitFor({ state: "visible", timeout: 7000 });

            clickSuccessful = true;
            console.log("Click and navigation successful.");
            break; // Exit click attempts
          } catch (clickError) {
            // console.log(`Click attempt failed: ${clickError.message}`);
            // Try next target or fail
          }
        }

        if (!clickSuccessful) {
          console.log(
            `Failed to click and navigate for result ${itemIndexForLog}. Skipping.`
          );
          resultsProcessedInFeed++; // <<< IMPORTANT: Increment index even on failure >>>
          continue; // Skip to the next iteration of the while loop
        }

        // --- Wait for Details Panel (already checked address button) ---
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
          resultsProcessedInFeed++; // <<< Increment index >>>
          continue;
        }

        // Extract business data
        const businessData = await extractBusinessData(page, settings);

        if (businessData) {
          const saveResult = await saveBusiness(businessData);
          if (saveResult.success) {
            scrapedBusinesses.push(businessData);
            console.log(
              `Saved business #${scrapedBusinesses.length}: ${businessData.name}`
            );
            // <<< Only increment scraped count on SUCCESS >>>
          } else if (saveResult.reason === "duplicate") {
            console.log(`Skipped duplicate business: ${businessData.name}`);
          }
        }

        // Random delay
        await randomDelay(settings.minDelay, settings.maxDelay);
      } catch (error) {
        console.error(`Error processing result ${itemIndexForLog}:`, error);
        // Continue with next result even after error
        await randomDelay(1000, 2000);
      }

      // <<< Increment the index for the next item in the feed >>>
      resultsProcessedInFeed++;

      // <<< Optional: Go back to search results? Sometimes needed, sometimes not. >>>
      // If clicks consistently fail after the first few, uncommenting this might help,
      // but it slows things down significantly.
      // console.log('Navigating back to results page (may be slow)...');
      // await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 });
      // await feedLocator.waitFor({ state: 'visible', timeout: 15000 }); // Wait for feed to reappear
      // await randomDelay(1000, 2000);
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
      businessDetails.website = await websiteLocator.getAttribute("href");
      console.log(`  [Website] Found (link): '${businessDetails.website}'`);
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

    // IMAGE URL
    console.log("Attempting to extract: IMAGE URL");
    try {
      // Selector for the main image shown in the details panel
      // This often involves a button wrapper around the image
      // const imageLocator = page
      //   .locator('button[jsaction*="imagery"] img')
      //   .first();
      const imageLocator = page
        .locator('button[aria-label^="Photo of"] img')
        .first();
      await imageLocator.waitFor({ state: "visible", timeout: 5000 });
      businessDetails.imageUrl = await imageLocator.getAttribute("src");
      // Often Google Maps URLs are very long, check if it looks like a valid image URL
      if (
        businessDetails.imageUrl &&
        businessDetails.imageUrl.startsWith(
          "https://lh5.googleusercontent.com/"
        )
      ) {
        console.log(
          `  [Image URL] Found: ${businessDetails.imageUrl.substring(0, 60)}...`
        ); // Log truncated URL
      } else {
        console.log(
          "  [Image URL] Found src attribute, but doesn't look like a standard Google User Content URL. Using anyway."
        );
        if (!businessDetails.imageUrl?.startsWith("http")) {
          console.log("  [Image URL] Invalid src extracted, setting to null");
          businessDetails.imageUrl = null; // Discard if clearly not a URL
        }
      }
    } catch (e) {
      console.log("  [Image URL] Selector failed.");
      businessDetails.imageUrl = null; // Ensure it's null if not found
    }

    console.log("--- Finished Data Extraction ---");
    return businessDetails;
  } catch (error) {
    console.error(`Error extracting business data for ${page.url()}:`, error);
    return null;
  }
}

module.exports = {
  scrapeGoogleMaps,
};
