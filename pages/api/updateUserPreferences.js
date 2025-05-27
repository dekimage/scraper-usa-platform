import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/clientApp";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, preferences } = req.body;

  if (!userId || !preferences) {
    return res
      .status(400)
      .json({ error: "User ID and preferences are required" });
  }

  try {
    const userDocRef = doc(db, "users", userId);

    await updateDoc(userDocRef, {
      preferences: preferences,
      lastUpdated: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "User preferences updated successfully",
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    res.status(500).json({ error: "Failed to update user preferences" });
  }
}
