import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/clientApp";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: "User ID and password are required" });
  }

  try {
    // Get user document from Firestore
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const userData = userDoc.data();

    // Check password (in production, you should hash passwords)
    if (userData.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Return user data (excluding password)
    const { password: _, ...userDataWithoutPassword } = userData;

    res.status(200).json({
      success: true,
      user: {
        id: userId,
        ...userDataWithoutPassword,
      },
    });
  } catch (error) {
    console.error("User authentication error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
