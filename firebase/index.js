const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  getCountFromServer,
  serverTimestamp,
} = require("firebase/firestore");
const config = require("../config");

// Initialize Firebase
let firebaseApp;
let db;

/**
 * Initialize Firebase connection
 */
function initFirebase() {
  if (!firebaseApp) {
    firebaseApp = initializeApp(config.firebase);
    db = getFirestore(firebaseApp);
    console.log("Firebase initialized");
  }
  return { app: firebaseApp, db };
}

/**
 * Save business data to Firestore
 * @param {Object} businessData - The business data to save
 * @returns {Promise} - Promise that resolves when data is saved
 */
async function saveBusiness(businessData) {
  try {
    const { db } = initFirebase();

    // Check if business already exists to prevent duplicates
    const businessesRef = collection(db, config.collection);
    const q = query(
      businessesRef,
      where("name", "==", businessData.name),
      where("address", "==", businessData.address)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.log(`Business "${businessData.name}" already exists. Skipping.`);
      return { success: false, reason: "duplicate" };
    }

    // Add timestamp
    businessData.scraped_at = new Date().toISOString();

    // Create a new document with auto-generated ID
    const newDocRef = doc(collection(db, config.collection));
    await setDoc(newDocRef, businessData);

    console.log(`Saved business: ${businessData.name}`);
    return { success: true, id: newDocRef.id };
  } catch (error) {
    console.error("Error saving business to Firestore:", error);
    return { success: false, error };
  }
}

/**
 * Creates or updates the summary for a single city after scraping.
 * Calculates the total count for that specific city using CLIENT SDK.
 * USES ORIGINAL CITY NAME AS DOCUMENT ID.
 * @param {string} city The name of the city scraped.
 */
async function updateSingleCitySummary(city) {
  const trimmedCity = city?.trim(); // Trim upfront
  if (!trimmedCity) {
    console.warn(
      "[Client City Summary] Skipping update due to empty city name."
    );
    return;
  }
  try {
    const { db } = initFirebase(); // Get CLIENT DB instance

    const businessesRef = collection(db, config.collection);
    // Query using the trimmed, original city name
    const cityQuery = query(businessesRef, where("city", "==", trimmedCity));

    console.log(`[Client City Summary] Getting count for city: ${trimmedCity}`);
    const snapshot = await getCountFromServer(cityQuery);
    const businessCount = snapshot.data().count;
    console.log(
      `[Client City Summary] Found ${businessCount} total businesses for ${trimmedCity}.`
    );

    // <<< USE ORIGINAL TRIMMED CITY NAME AS DOCUMENT ID >>>
    const cityId = trimmedCity;
    const cityRef = doc(db, "cities_summary", cityId); // Use client 'doc'

    console.log(`[Client City Summary] Updating summary document: ${cityId}`);
    // Use client 'setDoc' and 'serverTimestamp'
    await setDoc(
      cityRef,
      {
        name: trimmedCity, // Ensure name field also uses the original trimmed name
        businessCount: businessCount,
        lastScraped: serverTimestamp(),
      },
      { merge: true }
    );

    console.log(
      `[Client City Summary] Successfully updated summary for: ${trimmedCity} (ID: ${cityId})`
    );
  } catch (error) {
    console.error(
      `[Client City Summary] Failed to update single city summary for ${trimmedCity}:`,
      error
    );
    if (error.code === "permission-denied") {
      console.error(
        "Firestore Security Rules might be denying write access to 'cities_summary' for the client SDK."
      );
    }
  }
}

/**
 * Export results to CSV file
 * @param {Array} businesses - Array of business data
 * @param {string} filename - Output filename
 * @returns {Promise} - Promise that resolves when CSV is created
 */
async function exportToCSV(businesses, filename) {
  const fs = require("fs");
  const path = require("path");

  // Create CSV header
  const headers = [
    "name",
    "category",
    "address",
    "phone",
    "rating",
    "reviews",
    "website",
    "website_status",
    "maps_link",
    "city",
    "business_type",
    "scraped_at",
  ].join(",");

  // Create CSV rows
  const rows = businesses.map((business) => {
    return [
      `"${(business.name || "").replace(/"/g, '""')}"`,
      `"${(business.category || "").replace(/"/g, '""')}"`,
      `"${(business.address || "").replace(/"/g, '""')}"`,
      `"${(business.phone || "").replace(/"/g, '""')}"`,
      business.rating || "",
      business.reviews || "",
      `"${(business.website || "").replace(/"/g, '""')}"`,
      business.website_status || "",
      `"${(business.maps_link || "").replace(/"/g, '""')}"`,
      `"${(business.city || "").replace(/"/g, '""')}"`,
      `"${(business.business_type || "").replace(/"/g, '""')}"`,
      business.scraped_at || "",
    ].join(",");
  });

  // Combine header and rows
  const csv = [headers, ...rows].join("\n");

  // Write to file
  const outputPath = path.join(process.cwd(), filename);
  fs.writeFileSync(outputPath, csv);

  console.log(`CSV exported to: ${outputPath}`);
  return { success: true, path: outputPath };
}

module.exports = {
  initFirebase,
  saveBusiness,
  exportToCSV,
  updateSingleCitySummary,
};
