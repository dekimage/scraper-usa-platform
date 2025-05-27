import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/clientApp";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get all users from Firestore
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);

    const users = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      // Don't include password in response
      const { password, ...userWithoutPassword } = userData;
      users.push({
        id: doc.id,
        ...userWithoutPassword,
      });
    });

    res.status(200).json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}
