import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/clientApp";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, name, email, password, webCloser } = req.body;

  if (!id || !password) {
    return res.status(400).json({ error: "User ID and password are required" });
  }

  try {
    // Check if user already exists
    const userDocRef = doc(db, "users", id);
    const existingUser = await getDoc(userDocRef);

    if (existingUser.exists()) {
      return res.status(409).json({ error: "User ID already exists" });
    }

    // Create new user document
    const userData = {
      id,
      name: name || "",
      email: email || "",
      password, // In production, you should hash this
      assignedBusinesses: {},
      preferences: {},
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    // Add webCloser field if specified
    if (webCloser) {
      userData.webCloser = true;
      userData.receivedLeads = {}; // Initialize empty received leads map
    }

    await setDoc(userDocRef, userData);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = userData;

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
}
