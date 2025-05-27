import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";
import fs from "fs";

let adminDb;
let adminApp;

/**
 * Initializes the Firebase Admin SDK
 * Ensures initialization only happens once.
 */
export function initFirebaseAdmin() {
  // Check if the default app is already initialized
  if (admin.apps.length > 0) {
    // console.log('Admin SDK default app already exists.');
    adminApp = admin.app(); // Get the default app
    adminDb = getFirestore(adminApp);
    return { adminDb, adminApp };
  }

  // If not initialized, proceed with initialization
  try {
    // Construct the absolute path to the service account key
    // Assumes serviceAccountKey.json is in the project root
    const keyPath = path.join(process.cwd(), "serviceAccountKey.json");

    // <<< Add Log to check the path >>>
    console.log(`Checking for service account key at: ${keyPath}`);

    // Check if the key file exists
    if (!fs.existsSync(keyPath)) {
      console.error(`Error: Service account key file not found at ${keyPath}`);
      console.error(
        "Please download your service account key from Firebase project settings and place it in the project root as serviceAccountKey.json"
      );
      throw new Error("Service account key not found.");
    }

    // Read the service account key
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

    console.log("Initializing Firebase Admin SDK...");
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Add your databaseURL if needed, though often inferred
      // databaseURL: "https://<YOUR_PROJECT_ID>.firebaseio.com"
    });

    adminDb = getFirestore(adminApp);
    console.log("Firebase Admin SDK Initialized Successfully.");

    return { adminDb, adminApp };
  } catch (error) {
    console.error("Firebase Admin Initialization Error:", error);
    // Propagate the error or handle it as needed
    // Depending on your setup, you might want to prevent the app/API from starting
    throw new Error(
      `Failed to initialize Firebase Admin SDK: ${error.message}`
    );
  }
}
