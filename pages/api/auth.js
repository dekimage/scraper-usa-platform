export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;

  // Get admin credentials from environment variables
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Check if credentials match
  if (email === adminEmail && password === adminPassword) {
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ error: "Invalid credentials" });
}
