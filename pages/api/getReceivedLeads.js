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

  const { webCloserId, fromUserId } = req.query;

  if (!webCloserId) {
    return res.status(400).json({ error: "Web closer ID is required" });
  }

  try {
    // Get the web closer's document to access receivedLeads
    const webCloserDocRef = doc(db, "users", webCloserId);
    const webCloserDoc = await getDoc(webCloserDocRef);

    if (!webCloserDoc.exists()) {
      return res.status(404).json({ error: "Web closer not found" });
    }

    const webCloserData = webCloserDoc.data();
    if (!webCloserData.webCloser) {
      return res.status(400).json({ error: "User is not a web closer" });
    }

    const receivedLeads = webCloserData.receivedLeads || {};

    // If no fromUserId specified, return the overview of all users who passed leads
    if (!fromUserId) {
      // Get user names for each user ID in receivedLeads
      const userIds = Object.keys(receivedLeads);
      const userPromises = userIds.map(async (userId) => {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);
        return {
          id: userId,
          name: userDoc.exists() ? userDoc.data().name || userId : userId,
          email: userDoc.exists() ? userDoc.data().email : null,
          businessCount: receivedLeads[userId].length,
        };
      });

      const usersWithLeads = await Promise.all(userPromises);

      return res.status(200).json({
        receivedLeads: receivedLeads,
        usersWithLeads: usersWithLeads,
        totalBusinesses: Object.values(receivedLeads).flat().length,
      });
    }

    // If fromUserId is specified, return the actual business documents for that user
    const businessIds = receivedLeads[fromUserId] || [];

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

    res.status(200).json({
      businesses,
      fromUser: fromUserId,
      totalCount: businesses.length,
    });
  } catch (error) {
    console.error("Error fetching received leads:", error);
    res.status(500).json({ error: "Failed to fetch received leads" });
  }
}
