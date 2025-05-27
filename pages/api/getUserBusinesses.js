import {
  doc,
  getDoc,
  getDocs,
  query,
  where,
  collection,
} from "firebase/firestore";
import { db } from "../../firebase/clientApp";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, category } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // Get user document to see assigned businesses
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const assignedBusinesses = userData.assignedBusinesses || {};

    // If no category specified, return available categories
    if (!category) {
      return res.status(200).json({
        categories: Object.keys(assignedBusinesses),
        assignedBusinesses: assignedBusinesses,
      });
    }

    // If category specified, fetch those businesses
    const businessIds = assignedBusinesses[category] || [];

    if (businessIds.length === 0) {
      return res.status(200).json({ businesses: [] });
    }

    // Fetch business documents
    const businessPromises = businessIds.map(async (businessId) => {
      const businessDocRef = doc(db, "businesses", businessId);
      const businessDoc = await getDoc(businessDocRef);
      if (businessDoc.exists()) {
        return {
          id: businessId,
          ...businessDoc.data(),
          pipeline_status:
            businessDoc.data().pipeline_status || "Not Contacted",
        };
      }
      return null;
    });

    const businesses = (await Promise.all(businessPromises)).filter(Boolean);

    res.status(200).json({ businesses });
  } catch (error) {
    console.error("Error fetching user businesses:", error);
    res.status(500).json({ error: "Failed to fetch user businesses" });
  }
}
