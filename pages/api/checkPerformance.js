// import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
// import { adminDb } from "../../firebase/adminApp";

// // Basic function to call Google PageSpeed Insights API
// // IMPORTANT: You need to secure your API Key. DO NOT hardcode it here.
// // Use environment variables (process.env.PAGESPEED_API_KEY)
// async function getPageSpeedScore(url, apiKey) {
//   if (!apiKey) {
//     console.error("PageSpeed API Key is missing!");
//     throw new Error("Server configuration error: Missing PageSpeed API Key.");
//   }
//   // Use the mobile strategy by default, as it's often more critical
//   const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
//     url
//   )}&strategy=mobile&key=${apiKey}`;

//   try {
//     console.log(`Fetching PageSpeed for: ${url}`);
//     const response = await fetch(apiUrl);
//     if (!response.ok) {
//       // Log Google's error if available
//       const errorData = await response.json().catch(() => ({})); // Avoid crashing if body isn't JSON
//       console.error(
//         `PageSpeed API error for ${url}: ${response.status}`,
//         errorData
//       );
//       throw new Error(
//         `PageSpeed API request failed with status ${response.status}`
//       );
//     }
//     const data = await response.json();
//     // Performance score is from 0 to 1, multiply by 100
//     const score = data?.lighthouseResult?.categories?.performance?.score;
//     if (typeof score !== "number") {
//       console.warn(
//         `Could not extract performance score for ${url}`,
//         data?.lighthouseResult?.categories?.performance
//       );
//       return null; // Indicate score couldn't be retrieved
//     }
//     console.log(`Score for ${url}: ${Math.round(score * 100)}`);
//     return Math.round(score * 100);
//   } catch (error) {
//     console.error(`Error fetching PageSpeed for ${url}:`, error);
//     // Don't throw here, allow skipping this URL and continuing with others
//     return null;
//   }
// }

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     res.setHeader("Allow", ["POST"]);
//     return res.status(405).end(`Method ${req.method} Not Allowed`);
//   }

//   const { businesses } = req.body;

//   if (!Array.isArray(businesses) || businesses.length === 0) {
//     return res.status(400).json({
//       message: "Invalid request body. Expected an array of businesses.",
//     });
//   }

//   const apiKey = process.env.PAGESPEED_API_KEY;
//   if (!apiKey) {
//     console.error("PAGESPEED_API_KEY environment variable is not set.");
//     return res
//       .status(500)
//       .json({ message: "Server configuration error. API Key missing." });
//   }

//   let checked = 0;
//   let skipped = 0;
//   const updatePromises = [];

//   console.log(
//     `Received request to check performance for ${businesses.length} businesses.`
//   );

//   for (const business of businesses) {
//     if (!business || !business.id || !business.website) {
//       console.warn("Skipping invalid business data:", business);
//       skipped++;
//       continue;
//     }

//     try {
//       const score = await getPageSpeedScore(business.website, apiKey);

//       if (score !== null) {
//         const businessRef = doc(adminDb, "businesses", business.id);
//         updatePromises.push(
//           updateDoc(businessRef, {
//             performance_score: score,
//             performance_checked_date: serverTimestamp(), // Use server timestamp
//           })
//             .then(() => {
//               console.log(
//                 `Successfully updated score for business ID: ${business.id}`
//               );
//               checked++;
//             })
//             .catch((updateError) => {
//               console.error(
//                 `Failed to update Firestore for business ID ${business.id}:`,
//                 updateError
//               );
//               skipped++; // Count as skipped if DB update fails
//             })
//         );
//       } else {
//         console.log(
//           `Skipping Firestore update for ${business.id} due to missing score.`
//         );
//         skipped++;
//       }
//     } catch (error) {
//       // Errors during API call are caught in getPageSpeedScore, but catch any other unexpected errors
//       console.error(
//         `Unexpected error processing business ID ${business.id}:`,
//         error
//       );
//       skipped++;
//     }
//   }

//   // Wait for all Firestore updates to attempt completion
//   try {
//     await Promise.all(updatePromises);
//     console.log(
//       `Finished processing. Checked: ${checked}, Skipped: ${skipped}`
//     );
//     return res.status(200).json({
//       message: "Performance check process completed.",
//       checked,
//       skipped,
//     });
//   } catch (error) {
//     // This catch block might be less likely to be hit if individual promises handle errors,
//     // but good for safety.
//     console.error(
//       "Error during Promise.all wait for Firestore updates:",
//       error
//     );
//     // Return status based on potentially partial success
//     return res.status(500).json({
//       message: "Error occurred during Firestore updates.",
//       checked,
//       skipped,
//     });
//   }
// }
