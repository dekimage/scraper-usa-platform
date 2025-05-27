import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "../../firebase/adminApp"; // Adjust path if needed

// Helper to initialize admin app (avoids duplicate initialization)
const { adminDb } = initFirebaseAdmin();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method Not Allowed" });
  }

  // Optional: Add authentication/authorization check here
  // e.g., check if the user is an admin

  console.log("Starting city aggregation...");

  try {
    const businessesRef = adminDb.collection("businesses");
    const citiesSummaryRef = adminDb.collection("cities_summary");

    // Step 1: Get all unique cities and their counts from 'businesses'
    // Note: Firestore aggregation currently doesn't directly support group by string field.
    // We need to fetch all cities first, then count. This can be inefficient for VERY large datasets.
    // Alternative for huge scale: Use Cloud Functions + counters, or export to BigQuery.

    console.log(
      "Fetching all business documents (only city field needed ideally, but fetching full docs for simplicity now)..."
    );
    const allBusinessesSnapshot = await businessesRef.get();

    const cityCounts = {};
    allBusinessesSnapshot.forEach((doc) => {
      const city = doc.data()?.city;
      if (city) {
        const cityNameClean = city.trim(); // Basic cleaning
        cityCounts[cityNameClean] = (cityCounts[cityNameClean] || 0) + 1;
      }
    });

    const uniqueCities = Object.keys(cityCounts);
    console.log(`Found ${uniqueCities.length} unique cities.`);

    // Step 2: Clear existing cities_summary collection (optional, ensures clean slate)
    // Be cautious with deleting collections in production
    /*
    console.log("Deleting existing city summaries...");
    const existingSummaries = await getDocs(citiesSummaryRef);
    const deleteBatch = adminDb.batch(); // Use adminDb.batch()
    existingSummaries.forEach(doc => {
        deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();
    console.log("Existing summaries deleted.");
    */

    // Step 3: Write new counts to cities_summary
    console.log("Writing new city summaries...");
    const writeBatch = adminDb.batch(); // Use adminDb.batch()
    let citiesWritten = 0;

    for (const cityName of uniqueCities) {
      if (!cityName) continue; // Skip empty city names

      const cityDocRef = citiesSummaryRef.doc(cityName);
      const cityData = {
        name: cityName,
        businessCount: cityCounts[cityName],
        // imageUrl: null, // Add image fetching logic later
        lastUpdated: new Date(),
      };
      writeBatch.set(cityDocRef, cityData, { merge: true }); // Use set with merge to overwrite or create
      citiesWritten++;
    }

    await writeBatch.commit();
    console.log(`${citiesWritten} city summaries written.`);

    res.status(200).json({ success: true, cityCount: citiesWritten });
  } catch (error) {
    console.error("Error during city aggregation:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error",
    });
  }
}
