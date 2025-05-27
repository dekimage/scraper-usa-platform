import { scrapeGoogleMaps } from "../../scraper"
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore"
import { db } from "../../firebase/clientApp"

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { city, businessType, maxResults } = req.body

    // Validate required parameters
    if (!city || !businessType) {
      return res.status(400).json({
        error: "Missing required parameters",
        required: ["city", "businessType"],
      })
    }

    // Create a job record
    const jobRef = await addDoc(collection(db, "scraper_jobs"), {
      city,
      businessType,
      maxResults: maxResults || 300,
      status: "running",
      timestamp: serverTimestamp(),
    })

    // Start scraping in the background
    scrapeGoogleMaps({
      city,
      businessType,
      maxResults: maxResults || 300,
    })
      .then(async (result) => {
        // Update job record with results
        await updateDoc(doc(db, "scraper_jobs", jobRef.id), {
          status: "completed",
          resultsCount: result.total,
          completedAt: serverTimestamp(),
        })
      })
      .catch(async (error) => {
        // Update job record with error
        await updateDoc(doc(db, "scraper_jobs", jobRef.id), {
          status: "failed",
          error: error.message,
          completedAt: serverTimestamp(),
        })
      })

    // Return job ID immediately
    return res.status(200).json({
      success: true,
      message: "Scraper job started",
      jobId: jobRef.id,
    })
  } catch (error) {
    console.error("API error:", error)
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    })
  }
}
