export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error(
        "Admin credentials not configured in environment variables"
      );
      return res
        .status(500)
        .json({ error: "Admin authentication not configured" });
    }

    // Check credentials
    if (email !== adminEmail || password !== adminPassword) {
      console.log("Invalid admin login attempt:", email);
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    console.log("Admin authentication successful:", email);

    res.status(200).json({
      success: true,
      message: "Admin authentication successful",
    });
  } catch (error) {
    console.error("Admin authentication error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
