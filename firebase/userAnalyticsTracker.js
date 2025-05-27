// User-specific analytics tracking system
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
export const formatDateForStorage = (date = new Date()) => {
  return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD format
};

// Get today's date formatted for storage
export const getTodayFormatted = () => formatDateForStorage();

/**
 * Record a user's interaction with a business
 *
 * @param {Object} params - Parameters for recording the interaction
 * @param {string} params.userId - ID of the user performing the action
 * @param {string} params.businessId - ID of the business being updated
 * @param {string} params.businessName - Name of the business
 * @param {string} params.category - Business category
 * @param {string} params.city - City where the business is located
 * @param {string} params.actionType - Type of action ('status_change', 'notes_update', 'contact_attempt')
 * @param {string} [params.previousStatus] - Previous pipeline status (for status changes)
 * @param {string} [params.newStatus] - New pipeline status (for status changes)
 * @param {string} [params.notes] - Notes content (for notes updates)
 * @param {Date} [params.date] - Optional date of the interaction (defaults to today)
 * @returns {Promise<void>}
 */
export const recordUserInteraction = async ({
  userId,
  businessId,
  businessName,
  category,
  city,
  actionType,
  previousStatus,
  newStatus,
  notes,
  date = new Date(),
}) => {
  if (!userId || !businessId || !actionType) {
    console.error("Missing required parameters for user analytics tracking", {
      userId,
      businessId,
      actionType,
    });
    return;
  }

  try {
    // Format date for document ID (YYYY-MM-DD)
    const dateFormatted = formatDateForStorage(date);

    // Reference to user's analytics subcollection
    const userAnalyticsDocRef = doc(
      db,
      "users",
      userId,
      "analytics",
      dateFormatted
    );

    // Create timestamp for the interaction
    const timestamp = new Date();

    // Prepare the interaction details
    const interaction = {
      businessId,
      businessName: businessName || "Unnamed Business",
      category: category || "Uncategorized",
      city: city || "Unknown City",
      actionType,
      timestamp,
    };

    // Add specific fields based on action type
    if (actionType === "status_change") {
      interaction.previousStatus = previousStatus || "Not Contacted";
      interaction.newStatus = newStatus || "Not Contacted";
    } else if (actionType === "notes_update") {
      interaction.notes = notes || "";
      interaction.notesLength = (notes || "").length;
    }

    // Get the current document or create if it doesn't exist
    const docSnap = await getDoc(userAnalyticsDocRef);

    if (docSnap.exists()) {
      const currentData = docSnap.data();

      // Prepare the update
      const updateData = {
        // Increment total interactions
        totalInteractions: increment(1),
        // Add the interaction to the array
        interactions: arrayUnion(interaction),
        lastUpdated: timestamp,
      };

      // Update action-specific counters
      if (actionType === "status_change") {
        updateData.statusChanges = increment(1);

        // Track status-specific counts
        if (newStatus && newStatus !== "Not Contacted") {
          updateData[`statusCounts.${newStatus}`] = increment(1);
        }
        if (previousStatus && previousStatus !== "Not Contacted") {
          const prevCount = currentData.statusCounts?.[previousStatus] || 0;
          if (prevCount > 0) {
            updateData[`statusCounts.${previousStatus}`] = increment(-1);
          }
        }
      } else if (actionType === "notes_update") {
        updateData.notesUpdates = increment(1);
      }

      // Update category counts
      updateData[`categoryCounts.${category}`] = increment(1);

      // Update city counts
      updateData[`cityCounts.${city}`] = increment(1);

      await updateDoc(userAnalyticsDocRef, updateData);
    } else {
      // Document doesn't exist, create a new one

      // Initialize counters
      const statusCounts = {};
      const categoryCounts = { [category]: 1 };
      const cityCounts = { [city]: 1 };

      if (
        actionType === "status_change" &&
        newStatus &&
        newStatus !== "Not Contacted"
      ) {
        statusCounts[newStatus] = 1;
      }

      const newAnalytics = {
        userId,
        date: dateFormatted,
        created: timestamp,
        lastUpdated: timestamp,
        totalInteractions: 1,
        statusChanges: actionType === "status_change" ? 1 : 0,
        notesUpdates: actionType === "notes_update" ? 1 : 0,
        statusCounts,
        categoryCounts,
        cityCounts,
        interactions: [interaction],
      };

      await setDoc(userAnalyticsDocRef, newAnalytics);
    }
  } catch (error) {
    console.error("Error recording user analytics:", error);
    // Don't throw the error - we don't want analytics to break the main functionality
  }
};

/**
 * Get analytics data for a specific user and date
 *
 * @param {string} userId - User ID
 * @param {string|Date} date - Date to retrieve analytics for
 * @returns {Promise<Object|null>} - Analytics data or null if not found
 */
export const getUserAnalyticsForDate = async (userId, date = new Date()) => {
  try {
    const dateFormatted =
      typeof date === "string" ? date : formatDateForStorage(date);
    const userAnalyticsDocRef = doc(
      db,
      "users",
      userId,
      "analytics",
      dateFormatted
    );
    const docSnap = await getDoc(userAnalyticsDocRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }

    return null;
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    throw error;
  }
};

/**
 * Get available dates for a user's analytics data
 *
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of dates to return
 * @returns {Promise<Array<string>>} - Array of dates in YYYY-MM-DD format
 */
export const getUserAvailableAnalyticsDates = async (userId, limit = 30) => {
  try {
    const userAnalyticsRef = collection(db, "users", userId, "analytics");
    const querySnapshot = await getDocs(userAnalyticsRef);

    // Extract and sort dates
    const dates = querySnapshot.docs.map((doc) => doc.id);
    return dates.sort((a, b) => b.localeCompare(a)).slice(0, limit);
  } catch (error) {
    console.error("Error fetching user analytics dates:", error);
    return [];
  }
};

/**
 * Get summary statistics for a user across multiple dates
 *
 * @param {string} userId - User ID
 * @param {number} days - Number of recent days to include
 * @returns {Promise<Object>} - Summary statistics
 */
export const getUserAnalyticsSummary = async (userId, days = 7) => {
  try {
    const availableDates = await getUserAvailableAnalyticsDates(userId, days);

    let totalInteractions = 0;
    let totalStatusChanges = 0;
    let totalNotesUpdates = 0;
    const statusCounts = {};
    const categoryCounts = {};
    const cityCounts = {};

    for (const date of availableDates) {
      const dayData = await getUserAnalyticsForDate(userId, date);
      if (dayData) {
        totalInteractions += dayData.totalInteractions || 0;
        totalStatusChanges += dayData.statusChanges || 0;
        totalNotesUpdates += dayData.notesUpdates || 0;

        // Aggregate status counts
        if (dayData.statusCounts) {
          Object.entries(dayData.statusCounts).forEach(([status, count]) => {
            statusCounts[status] = (statusCounts[status] || 0) + count;
          });
        }

        // Aggregate category counts
        if (dayData.categoryCounts) {
          Object.entries(dayData.categoryCounts).forEach(
            ([category, count]) => {
              categoryCounts[category] =
                (categoryCounts[category] || 0) + count;
            }
          );
        }

        // Aggregate city counts
        if (dayData.cityCounts) {
          Object.entries(dayData.cityCounts).forEach(([city, count]) => {
            cityCounts[city] = (cityCounts[city] || 0) + count;
          });
        }
      }
    }

    return {
      totalInteractions,
      totalStatusChanges,
      totalNotesUpdates,
      statusCounts,
      categoryCounts,
      cityCounts,
      daysWithData: availableDates.length,
      dateRange:
        availableDates.length > 0
          ? {
              from: availableDates[availableDates.length - 1],
              to: availableDates[0],
            }
          : null,
    };
  } catch (error) {
    console.error("Error fetching user analytics summary:", error);
    return {
      totalInteractions: 0,
      totalStatusChanges: 0,
      totalNotesUpdates: 0,
      statusCounts: {},
      categoryCounts: {},
      cityCounts: {},
      daysWithData: 0,
      dateRange: null,
    };
  }
};

export default {
  recordUserInteraction,
  getUserAnalyticsForDate,
  getUserAvailableAnalyticsDates,
  getUserAnalyticsSummary,
  getTodayFormatted,
  formatDateForStorage,
};
