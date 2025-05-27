// Configuration settings for the scraper
module.exports = {
  // Default settings (can be overridden via CLI)
  defaultSettings: {
    city: "Park City",
    businessType: "Barber",
    maxResults: 1, // Set to 1 for now
    minDelay: 500, // 0.5 seconds
    maxDelay: 1000, // 1 second
  },

  // Firebase configuration (replace with your Firebase project details)
  firebase: {
    apiKey: "AIzaSyCBVd2JShDZ6QKvFuN6vXOapPKKgSMR24I",
    authDomain: "scraper-usa-platform.firebaseapp.com",
    projectId: "scraper-usa-platform",
    storageBucket: "scraper-usa-platform.firebasestorage.app",
    messagingSenderId: "562562659821",
    appId: "1:562562659821:web:d06bb4f6927b380b9ee3e4",
    measurementId: "G-MVH3D4S2DB",
  },

  // Collection name in Firestore
  collection: "businesses",

  // Future additions (placeholders)
  proxies: {
    enabled: false,
    // list: [] // Add proxy list here when implementing
  },

  captcha: {
    enabled: false,
    // provider: "2captcha",
    // apiKey: ""
  },
};
