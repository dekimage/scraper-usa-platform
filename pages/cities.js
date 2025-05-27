"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Loader2, BarChart } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/clientApp";

// Components
import DashboardLayout from "../components/DashboardLayout";
import CityGrid from "../components/CityGrid";
import AdminLoginForm from "../components/AdminLoginForm";
import { Button } from "@/components/ui/button";

export default function CitiesPage() {
  const router = useRouter();
  const [citySummaries, setCitySummaries] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [isAggregating, setIsAggregating] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if we're on localhost and admin authentication
  useEffect(() => {
    setIsLocalhost(window.location.hostname === "localhost");

    // Check admin authentication
    const checkAdminAuth = () => {
      const adminAuth = localStorage.getItem("adminAuth");
      if (adminAuth) {
        try {
          const parsed = JSON.parse(adminAuth);
          // Check if login is not too old (24 hours)
          const loginTime = new Date(parsed.loginTime);
          const now = new Date();
          const hoursDiff = (now - loginTime) / (1000 * 60 * 60);

          if (hoursDiff < 24 && parsed.isAdmin) {
            setIsAdminAuthenticated(true);
          } else {
            // Session expired
            localStorage.removeItem("adminAuth");
          }
        } catch (error) {
          console.error("Error parsing admin auth data:", error);
          localStorage.removeItem("adminAuth");
        }
      }
      setIsCheckingAuth(false);
    };

    checkAdminAuth();
  }, []);

  // Load initial city data
  useEffect(() => {
    fetchCitySummaries();
  }, []);

  // Fetch City Summaries
  const fetchCitySummaries = async () => {
    setLoadingCities(true);
    try {
      const citiesQuery = query(
        collection(db, "cities_summary"),
        orderBy("name")
      );
      const querySnapshot = await getDocs(citiesQuery);
      const summaries = [];
      querySnapshot.forEach((doc) => {
        summaries.push({ id: doc.id, ...doc.data() });
      });
      setCitySummaries(summaries);
    } catch (error) {
      console.error("Error fetching city summaries:", error);
      toast.error("Failed to load city summaries. Try recalculating.");
      setCitySummaries([]); // Ensure it's an empty array on error
    } finally {
      setLoadingCities(false);
    }
  };

  // Trigger city aggregation
  const handleAggregateCities = async () => {
    setIsAggregating(true);
    toast.loading("Recalculating city counts...", { id: "aggregating" });
    try {
      const response = await fetch("/api/aggregateCities", { method: "POST" });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(
          `Successfully updated city counts. Found ${data.cityCount} cities.`,
          { id: "aggregating" }
        );
        fetchCitySummaries(); // Refresh the city list
      } else {
        throw new Error(data.error || "Aggregation failed");
      }
    } catch (error) {
      console.error("Error aggregating cities:", error);
      toast.error(`Failed to recalculate city counts: ${error.message}`, {
        id: "aggregating",
      });
    } finally {
      setIsAggregating(false);
    }
  };

  // Navigate to dashboard with city filter
  const handleSelectCity = (cityName) => {
    router.push({
      pathname: "/businesses",
      query: { city: cityName },
    });
  };

  // Functions for editing image URL
  const handleEditImageClick = (city) => {
    setEditingCity(city);
    setImageUrlInput(city.imageUrl || ""); // Pre-fill input
  };

  const handleCancelEdit = () => {
    setEditingCity(null);
    setImageUrlInput("");
  };

  const handleSaveImageUrl = async () => {
    if (!editingCity) return;

    const cityId = editingCity.id;
    const newUrl = imageUrlInput.trim();

    toast.loading(`Saving image URL for ${cityId}...`, { id: "savingImage" });
    try {
      const cityDocRef = doc(db, "cities_summary", cityId);
      await updateDoc(cityDocRef, {
        imageUrl: newUrl, // Update or add the imageUrl field
      });
      toast.success("Image URL saved successfully!", { id: "savingImage" });
      handleCancelEdit(); // Close modal
      fetchCitySummaries(); // Refresh list to show new image
    } catch (error) {
      console.error("Error saving image URL:", error);
      toast.error(`Failed to save image URL: ${error.message}`, {
        id: "savingImage",
      });
    }
  };

  // Handle admin login success
  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // Show admin login if not authenticated
  if (!isAdminAuthenticated) {
    return <AdminLoginForm onLoginSuccess={handleAdminLoginSuccess} />;
  }

  return (
    <>
      <Head>
        <title>Cities Overview - Scraper Dashboard</title>
        <meta name="description" content="Overview of scraped cities" />
      </Head>

      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold">Cities Overview</h1>
              <p className="text-muted-foreground">
                Select a city to view its businesses or recalculate counts.
              </p>
            </div>
            <div className="flex gap-2">
              {isLocalhost && (
                <Button
                  variant="outline"
                  onClick={handleAggregateCities}
                  disabled={isAggregating}
                >
                  {isAggregating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <BarChart className="h-4 w-4 mr-2" />
                  )}
                  Recalculate City Counts
                </Button>
              )}
            </div>
          </div>

          {/* City Grid Display */}
          <CityGrid
            cities={citySummaries}
            onSelectCity={handleSelectCity}
            onEdit={handleEditImageClick}
            loading={loadingCities}
          />
        </div>
      </DashboardLayout>

      {/* Simple Modal/Form for Editing Image URL */}
      {editingCity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              Edit Image URL for {editingCity.name || editingCity.id}
            </h3>
            <label className="block text-sm mb-1">Image URL:</label>
            <input
              type="url"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              className="w-full p-2 border rounded-md mb-4"
              placeholder="https://example.com/image.jpg"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveImageUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save URL
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
