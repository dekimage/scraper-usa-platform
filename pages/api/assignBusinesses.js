import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase/clientApp";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, businessIds } = req.body;

  if (!userId || !businessIds || !Array.isArray(businessIds)) {
    return res
      .status(400)
      .json({ error: "User ID and business IDs array are required" });
  }

  try {
    // Get user document
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get business documents to organize by category
    const businessPromises = businessIds.map(async (businessId) => {
      const businessDocRef = doc(db, "businesses", businessId);
      const businessDoc = await getDoc(businessDocRef);
      if (businessDoc.exists()) {
        return {
          id: businessId,
          category: businessDoc.data().category || "Uncategorized",
        };
      }
      return null;
    });

    const businesses = (await Promise.all(businessPromises)).filter(Boolean);

    // Organize businesses by category
    const businessesByCategory = {};
    businesses.forEach((business) => {
      if (!businessesByCategory[business.category]) {
        businessesByCategory[business.category] = [];
      }
      businessesByCategory[business.category].push(business.id);
    });

    // Get current user data
    const currentUserData = userDoc.data();
    const currentBusinesses = currentUserData.assignedBusinesses || {};

    // Merge with existing assigned businesses
    const updatedBusinesses = { ...currentBusinesses };

    Object.keys(businessesByCategory).forEach((category) => {
      if (updatedBusinesses[category]) {
        // Add new business IDs to existing category, avoiding duplicates
        const existingIds = new Set(updatedBusinesses[category]);
        businessesByCategory[category].forEach((id) => existingIds.add(id));
        updatedBusinesses[category] = Array.from(existingIds);
      } else {
        // Create new category
        updatedBusinesses[category] = businessesByCategory[category];
      }
    });

    // Update user document
    await updateDoc(userDocRef, {
      assignedBusinesses: updatedBusinesses,
      lastUpdated: new Date(),
    });

    res.status(200).json({
      success: true,
      message: `Assigned ${businesses.length} businesses to user ${userId}`,
      assignedBusinesses: updatedBusinesses,
    });
  } catch (error) {
    console.error("Error assigning businesses:", error);
    res.status(500).json({ error: "Failed to assign businesses" });
  }
}
