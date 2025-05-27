#!/usr/bin/env node

const { scrapeGoogleMaps } = require("./scraper");
const minimist = require("minimist");

// Parse command line arguments
const argv = minimist(process.argv.slice(2), {
  string: ["city", "business_type"],
  number: ["max_results"],
  boolean: ["export_csv"],
  alias: {
    c: "city",
    b: "business_type",
    m: "max_results",
    e: "export_csv",
    h: "help",
  },
  default: {
    city: "Park City",
    business_type: "Barber",
    max_results: 20,
    export_csv: false,
  },
});

// Show help
if (argv.help) {
  console.log(`
Google Maps Scraper CLI

Usage:
  node runScraper.js [options]

Options:
  -c, --city           City or location to search (default: "Park City")
  -b, --business_type  Business type or category (default: "Barber")
  -m, --max_results    Maximum number of results to scrape (default: 20)
  -e, --export_csv     Export results to CSV file (default: false)
  -h, --help           Show this help message

Examples:
  node runScraper.js --city="New York" --business_type="Coffee Shop" --max_results=200 --export_csv
  node runScraper.js -c "London" -b "Gym" -m 100
  `);
  process.exit(0);
}

// Run the scraper
async function run() {
  try {
    console.log("Starting Google Maps Scraper...");
    console.log(`City: ${argv.city}`);
    console.log(`Business Type: ${argv.business_type}`);
    console.log(`Max Results: ${argv.max_results}`);
    console.log(`Export CSV: ${argv.export_csv}`);

    const result = await scrapeGoogleMaps({
      city: argv.city,
      businessType: argv.business_type,
      maxResults: argv.max_results,
      exportCsv: argv.export_csv,
    });

    console.log(`Scraping completed. Scraped ${result.total} businesses.`);

    if (result.exportedCsv && result.exportedCsv.success) {
      console.log(`CSV exported to: ${result.exportedCsv.path}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error running scraper:", error);
    process.exit(1);
  }
}

// Run the script
run();
