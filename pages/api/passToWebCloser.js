import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase/clientApp";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fromUserId, toWebCloserId, businessIds } = req.body;

  if (
    !fromUserId ||
    !toWebCloserId ||
    !businessIds ||
    !Array.isArray(businessIds)
  ) {
    return res.status(400).json({
      error: "From user ID, web closer ID, and business IDs array are required",
    });
  }

  try {
    // Verify the target user is actually a web closer
    const webCloserDocRef = doc(db, "users", toWebCloserId);
    const webCloserDoc = await getDoc(webCloserDocRef);

    if (!webCloserDoc.exists()) {
      return res.status(404).json({ error: "Web closer not found" });
    }

    const webCloserData = webCloserDoc.data();
    if (!webCloserData.webCloser) {
      return res.status(400).json({ error: "Target user is not a web closer" });
    }

    // Get the current received leads map for the web closer
    const currentReceivedLeads = webCloserData.receivedLeads || {};

    // Update the received leads map for this web closer
    const updatedReceivedLeads = { ...currentReceivedLeads };

    if (updatedReceivedLeads[fromUserId]) {
      // User already exists in the map, add new business IDs avoiding duplicates
      const existingIds = new Set(updatedReceivedLeads[fromUserId]);
      businessIds.forEach((id) => existingIds.add(id));
      updatedReceivedLeads[fromUserId] = Array.from(existingIds);
    } else {
      // New user, create new array
      updatedReceivedLeads[fromUserId] = businessIds;
    }

    // Update the web closer's document with the new received leads
    await updateDoc(webCloserDocRef, {
      receivedLeads: updatedReceivedLeads,
      lastUpdated: new Date(),
    });

    // Update each business document to mark it as passed to the web closer
    const businessUpdatePromises = businessIds.map(async (businessId) => {
      const businessDocRef = doc(db, "businesses", businessId);
      return updateDoc(businessDocRef, {
        passedTo: toWebCloserId,
        passedBy: fromUserId,
        passedAt: new Date(),
      });
    });

    await Promise.all(businessUpdatePromises);

    res.status(200).json({
      success: true,
      message: `Successfully passed ${businessIds.length} businesses to web closer ${toWebCloserId}`,
      passedBusinesses: businessIds,
      receivedLeads: updatedReceivedLeads,
    });
  } catch (error) {
    console.error("Error passing businesses to web closer:", error);
    res.status(500).json({ error: "Failed to pass businesses to web closer" });
  }
}
