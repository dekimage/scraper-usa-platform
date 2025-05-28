import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/clientApp";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get all users from Firestore who have webCloser: true
    const usersRef = collection(db, "users");
    const webClosersQuery = query(usersRef, where("webCloser", "==", true));
    const querySnapshot = await getDocs(webClosersQuery);

    const webClosers = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      // Don't include password in response
      const { password, ...userWithoutPassword } = userData;
      webClosers.push({
        id: doc.id,
        ...userWithoutPassword,
      });
    });

    res.status(200).json({ webClosers });
  } catch (error) {
    console.error("Error fetching web closers:", error);
    res.status(500).json({ error: "Failed to fetch web closers" });
  }
}
