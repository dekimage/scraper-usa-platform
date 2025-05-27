export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { city, email, password } = req.body;

  // Get protected city credentials from environment variables
  const protectedCities = {
    Skopje: {
      email: process.env.SKOPJE_EMAIL,
      password: process.env.SKOPJE_PASSWORD,
    },
    // Add more protected cities here as needed
  };

  // Check if the city is protected
  if (!protectedCities[city]) {
    return res.status(200).json({ success: true }); // City is not protected
  }

  // Check credentials for protected city
  const cityCredentials = protectedCities[city];
  if (
    email === cityCredentials.email &&
    password === cityCredentials.password
  ) {
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ error: "Invalid credentials" });
}
