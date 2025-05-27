// Utility for tracking and retrieving analytics data in Firestore
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
  increment,
} from "firebase/firestore";
import { db } from "./clientApp";

// Format date to YYYY-MM-DD for document IDs
const formatDateForStorage = (date = new Date()) => {
  return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD format
};

// Get today's date formatted for storage
const getTodayFormatted = () => formatDateForStorage();

/**
 * Record a pipeline status change in the analytics collection
 *
 * @param {Object} params - Parameters for recording the status change
 * @param {string} params.businessId - ID of the business being updated
 * @param {string} params.businessName - Name of the business
 * @param {string} params.category - Business category
 * @param {string} params.city - City where the business is located
 * @param {string} params.previousStatus - Previous pipeline status
 * @param {string} params.newStatus - New pipeline status
 * @param {Date} [params.date] - Optional date of the change (defaults to today)
 * @returns {Promise<void>}
 */
export const recordPipelineStatusChange = async ({
  businessId,
  businessName,
  category,
  city,
  previousStatus,
  newStatus,
  date = new Date(),
}) => {
  if (!businessId || !city) {
    console.error("Missing required parameters for analytics tracking", {
      businessId,
      city,
    });
    return;
  }

  try {
    // Format date for document ID (YYYY-MM-DD)
    const dateFormatted = formatDateForStorage(date);
    console.log(
      `Analytics: Recording status change for date: ${dateFormatted}, city: ${city}`
    );
    console.log(
      `Analytics: Business: ${businessName} (${businessId}), Category: ${category}`
    );
    console.log(
      `Analytics: Status change: ${previousStatus || "Not Contacted"} → ${
        newStatus || "Not Contacted"
      }`
    );

    const analyticsDocRef = doc(db, "analytics", dateFormatted);

    // Create timestamp for the interaction
    // Note: Using new Date() instead of serverTimestamp() for immediate feedback
    // serverTimestamp() doesn't populate until the document is committed, which can cause confusion
    const timestamp = new Date();

    // Prepare the interaction details
    const interaction = {
      businessId,
      businessName: businessName || "Unnamed Business",
      category: category || "Uncategorized",
      previousStatus: previousStatus || "Not Contacted",
      newStatus: newStatus || "Not Contacted",
      timestamp,
    };

    // Get the current document or create if it doesn't exist
    const docSnap = await getDoc(analyticsDocRef);

    if (docSnap.exists()) {
      console.log(`Analytics: Document exists for date ${dateFormatted}`);

      // Document exists, update it with all necessary fields
      const cityData = docSnap.data().cities?.[city] || {
        totalInteractions: 0,
        statusCounts: {},
        interactions: [],
      };

      // Prepare the update
      const updateData = {};

      // If this city data doesn't exist yet, initialize everything
      if (!docSnap.data().cities?.[city]) {
        console.log(`Analytics: Initializing city ${city} data`);
        updateData[`cities.${city}`] = {
          totalInteractions: 1,
          statusCounts: {},
          interactions: [interaction],
        };

        // Only add the new status count if it's not the default
        if (newStatus && newStatus !== "Not Contacted") {
          updateData[`cities.${city}.statusCounts.${newStatus}`] = 1;
        }
      } else {
        // City exists, update counts and add interaction
        console.log(`Analytics: Updating existing city ${city} data`);

        // Increment total interactions
        updateData[`cities.${city}.totalInteractions`] = increment(1);

        // Update status counts (if not default status)
        if (previousStatus && previousStatus !== "Not Contacted") {
          const prevCount = cityData.statusCounts[previousStatus] || 0;
          if (prevCount > 0) {
            updateData[`cities.${city}.statusCounts.${previousStatus}`] =
              increment(-1);
          }
        }

        if (newStatus && newStatus !== "Not Contacted") {
          updateData[`cities.${city}.statusCounts.${newStatus}`] = increment(1);
        }

        // Add the interaction to the array
        updateData[`cities.${city}.interactions`] = arrayUnion(interaction);
      }

      // Update the document with all our changes
      console.log(`Analytics: Updating document with:`, updateData);
      await updateDoc(analyticsDocRef, updateData);
      console.log(`Analytics: Update successful`);
    } else {
      // Document doesn't exist, create a new one
      console.log(`Analytics: Creating new document for date ${dateFormatted}`);

      // Initialize status counts with only the new status if it's not the default
      const statusCounts = {};
      if (newStatus && newStatus !== "Not Contacted") {
        statusCounts[newStatus] = 1;
      }

      const newAnalytics = {
        date: dateFormatted,
        created: timestamp,
        cities: {
          [city]: {
            totalInteractions: 1,
            statusCounts,
            interactions: [interaction],
          },
        },
      };

      console.log(`Analytics: Setting new document:`, newAnalytics);
      await setDoc(analyticsDocRef, newAnalytics);
      console.log(`Analytics: Document created successfully`);
    }

    console.log(
      `Analytics tracked successfully for ${city} - Status changed to ${newStatus}`
    );
  } catch (error) {
    console.error("Error recording analytics:", error);
    // Don't throw the error - we don't want analytics to break the main functionality
  }
};

/**
 * Get analytics data for a specific date
 *
 * @param {string|Date} date - Date to retrieve analytics for (string in YYYY-MM-DD format or Date object)
 * @returns {Promise<Object|null>} - Analytics data or null if not found
 */
export const getAnalyticsForDate = async (date = new Date()) => {
  try {
    const dateFormatted =
      typeof date === "string" ? date : formatDateForStorage(date);
    const analyticsDocRef = doc(db, "analytics", dateFormatted);
    const docSnap = await getDoc(analyticsDocRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }

    return null;
  } catch (error) {
    console.error("Error fetching analytics:", error);
    throw error;
  }
};

/**
 * Get available dates for analytics data
 *
 * @param {number} limit - Maximum number of dates to return
 * @returns {Promise<Array<string>>} - Array of dates in YYYY-MM-DD format
 */
export const getAvailableAnalyticsDates = async (limit = 30) => {
  try {
    const analyticsRef = collection(db, "analytics");
    const querySnapshot = await getDocs(analyticsRef);

    // Extract and sort dates
    const dates = querySnapshot.docs.map((doc) => doc.id);
    return dates.sort((a, b) => b.localeCompare(a)).slice(0, limit);
  } catch (error) {
    console.error("Error fetching analytics dates:", error);
    return [];
  }
};

/**
 * Get list of all cities with analytics data for a specific date
 *
 * @param {string|Date} date - Date to retrieve cities for
 * @returns {Promise<Array<string>>} - Array of city names
 */
export const getCitiesForDate = async (date = new Date()) => {
  try {
    const analytics = await getAnalyticsForDate(date);

    if (!analytics || !analytics.cities) {
      return [];
    }

    return Object.keys(analytics.cities).sort();
  } catch (error) {
    console.error("Error fetching cities for date:", error);
    return [];
  }
};

/**
 * Get analytics data for a specific city on a specific date
 *
 * @param {string} city - City name
 * @param {string|Date} date - Date to retrieve data for
 * @returns {Promise<Object|null>} - City analytics data or null if not found
 */
export const getCityAnalytics = async (city, date = new Date()) => {
  try {
    const analytics = await getAnalyticsForDate(date);

    if (!analytics || !analytics.cities || !analytics.cities[city]) {
      return null;
    }

    return {
      city,
      date: analytics.id,
      ...analytics.cities[city],
    };
  } catch (error) {
    console.error(`Error fetching analytics for ${city}:`, error);
    return null;
  }
};

export default {
  recordPipelineStatusChange,
  getAnalyticsForDate,
  getAvailableAnalyticsDates,
  getCitiesForDate,
  getCityAnalytics,
  getTodayFormatted,
  formatDateForStorage,
};
