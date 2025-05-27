"use client";

import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import { Loader2, Download, ArrowLeft, RefreshCw, Star } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  limit,
} from "firebase/firestore";
import { db } from "../firebase/clientApp";
import CityLoginForm from "../components/CityLoginForm";

// Components
import DashboardLayout from "../components/DashboardLayout";
import BusinessTable from "../components/BusinessTable";
import StatsCards from "../components/StatsCards";

export default function BusinessesPage() {
  const router = useRouter();
  const { city } = router.query; // Get city from query parameter

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cityCategories, setCityCategories] = useState([]);
  const [syncingCategories, setSyncingCategories] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);

  // Cache for businesses by category
  const [businessesByCategory, setBusinessesByCategory] = useState({});
  const [currentCategory, setCurrentCategory] = useState("all");
  const [defaultCategory, setDefaultCategory] = useState(null);
  const [defaultWebsiteFilter, setDefaultWebsiteFilter] = useState("");
  const [loadingCategory, setLoadingCategory] = useState("");
  const [allBusinessesLoaded, setAllBusinessesLoaded] = useState(false);
  const [settingDefaultCategory, setSettingDefaultCategory] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    noWebsite: 0,
    socialOnly: 0,
    realWebsite: 0,
    notContacted: 0,
    contacted: 0,
  });

  // State for combined filters from BusinessTable
  const [filters, setFilters] = useState({
    searchTerm: "",
    category: "",
    websiteStatus: "",
    pipelineStatus: "",
    hideNoPhone: true,
    hideNotQualified: false,
    areaCode: "",
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Add this near the top of the component, with other state declarations
  const [isLocalhost, setIsLocalhost] = useState(false);

  // Add this useEffect to check if we're on localhost
  useEffect(() => {
    setIsLocalhost(
      window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
    );
  }, []);

  // Check if the current city requires authentication
  const isProtectedCity = (city) => {
    const protectedCities = ["Skopje"]; // Add more protected cities as needed
    return protectedCities.includes(city);
  };

  // Check authentication on mount and when city changes
  useEffect(() => {
    const checkAuth = () => {
      if (!city) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      if (isProtectedCity(city)) {
        const authStatus = localStorage.getItem(`isAuthenticated_${city}`);
        setIsAuthenticated(authStatus === "true");
      } else {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [city]);

  // Handle successful login
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // Function to calculate stats from a list of businesses
  const calculateStats = (businessList) => {
    if (!businessList || businessList.length === 0) {
      return {
        total: 0,
        noWebsite: 0,
        socialOnly: 0,
        realWebsite: 0,
        notContacted: 0,
        contacted: 0,
      };
    }
    return {
      total: businessList.length,
      noWebsite: businessList.filter((b) => b.website_status === "none").length,
      socialOnly: businessList.filter(
        (b) => b.website_status === "facebook/instagram"
      ).length,
      realWebsite: businessList.filter((b) => b.website_status === "real")
        .length,
      notContacted: businessList.filter(
        (b) => (b.pipeline_status || "Not Contacted") === "Not Contacted"
      ).length,
      contacted: businessList.filter(
        (b) => b.pipeline_status && b.pipeline_status !== "Not Contacted"
      ).length, // Count anything other than default
    };
  };

  // Fetch city categories when city is available
  useEffect(() => {
    if (!city) return;

    console.log(`Fetching categories for city: ${city}`);
    setLoading(true);

    const fetchCityCategories = async () => {
      try {
        const cityDocRef = doc(db, "cities_summary", city);
        const cityDoc = await getDoc(cityDocRef);

        if (cityDoc.exists()) {
          const data = cityDoc.data();
          console.log(`City data:`, data);

          if (data.categories && Array.isArray(data.categories)) {
            setCityCategories(data.categories);

            // Check if there's a default category
            const defaultCat = data.defaultCategory;
            setDefaultCategory(defaultCat || null);

            // Check if there's a default website filter
            const defaultFilter = data.defaultWebsiteFilter;
            setDefaultWebsiteFilter(defaultFilter || "");

            // Apply the default website filter if it exists
            if (defaultFilter) {
              setFilters((prev) => ({
                ...prev,
                websiteStatus: defaultFilter,
              }));
            }

            console.log(`Default category: ${defaultCat}`);
            console.log(`Default website filter: ${defaultFilter}`);

            // If categories exist, first try to load default category if it exists
            if (data.categories.length > 0) {
              // Use default category if available, otherwise use first category
              const categoryToLoad =
                defaultCat && data.categories.includes(defaultCat)
                  ? defaultCat
                  : data.categories[0];

              console.log(`Loading category: ${categoryToLoad}`);
              setCurrentCategory(categoryToLoad);
              await fetchBusinessesByCategory(categoryToLoad);
            } else {
              console.log("No categories found");
              setLoading(false);
            }
          } else {
            // No categories yet, show option to sync
            console.log("No categories array in city data");
            setLoading(false);
          }
        } else {
          console.error("City document not found");
          toast.error("City information not found");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching city categories:", error);
        toast.error("Failed to load city categories");
        setLoading(false);
      }
    };

    fetchCityCategories().catch((err) => {
      console.error("Unhandled exception in fetchCityCategories:", err);
      setLoading(false);
    });
  }, [city]);

  // Function to set current category as default
  const setCurrentCategoryAsDefault = async () => {
    if (
      !city ||
      !currentCategory ||
      currentCategory === "all" ||
      settingDefaultCategory
    )
      return;

    setSettingDefaultCategory(true);
    const toastId = toast.loading(
      `Setting "${currentCategory}" as default category...`
    );

    try {
      const cityDocRef = doc(db, "cities_summary", city);

      // Update the default category in the city document
      await updateDoc(cityDocRef, {
        defaultCategory: currentCategory,
        lastUpdated: new Date(),
      });

      setDefaultCategory(currentCategory);
      toast.success(
        `"${currentCategory}" is now the default category for ${formattedCity}`,
        { id: toastId }
      );
    } catch (error) {
      console.error("Error setting default category:", error);
      toast.error("Failed to set default category", { id: toastId });
    } finally {
      setSettingDefaultCategory(false);
    }
  };

  // Function to fetch businesses for a specific category
  const fetchBusinessesByCategory = async (category, forceRefresh = false) => {
    if (!city) {
      console.error("Cannot fetch businesses: No city specified");
      return;
    }

    console.log(
      `Fetching businesses for category: ${category}, forceRefresh: ${forceRefresh}`
    );

    // If we've already fetched this category and don't need to refresh, use cached data
    if (businessesByCategory[category] && !forceRefresh) {
      console.log(
        `Using cached data for ${category}, ${businessesByCategory[category].length} businesses`
      );
      setBusinesses(businessesByCategory[category]);
      setStats(calculateStats(businessesByCategory[category]));
      setLoading(false); // Make sure to set loading to false here
      return;
    }

    setLoadingCategory(category);

    try {
      const businessesRef = collection(db, "businesses");
      let q;

      if (category === "all") {
        // Fetch all businesses for the city (use with caution)
        console.log(`WARNING: Fetching ALL businesses for city ${city}`);
        q = query(businessesRef, where("city", "==", city));
        setAllBusinessesLoaded(true);
      } else {
        // Fetch only the specified category
        console.log(
          `Fetching businesses for city ${city}, category ${category}`
        );
        q = query(
          businessesRef,
          where("city", "==", city),
          where("category", "==", category)
        );
      }

      const querySnapshot = await getDocs(q);
      console.log(`Fetched ${querySnapshot.docs.length} businesses`);

      const businessesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        pipeline_status: doc.data().pipeline_status || "Not Contacted",
      }));

      // Cache the results
      setBusinessesByCategory((prev) => ({
        ...prev,
        [category]: businessesData,
      }));

      // Update current displayed businesses
      setBusinesses(businessesData);

      // Calculate and set stats based on these businesses
      setStats(calculateStats(businessesData));

      // If this is "all" category, collect unique categories for syncing
      if (category === "all") {
        const uniqueCats = [
          ...new Set(businessesData.map((b) => b.category).filter(Boolean)),
        ];
        setAvailableCategories(uniqueCats);
      }

      setLoading(false); // Make sure loading is set to false when done
    } catch (error) {
      console.error(
        `Error fetching businesses for category ${category}:`,
        error
      );
      if (error.code === "failed-precondition") {
        toast.error(
          "Database query failed. A required index might be missing. Please check Firestore indexes."
        );
      } else {
        toast.error(`Failed to load businesses for category: ${category}`);
      }
      setLoading(false); // Make sure to set loading to false on error
    } finally {
      setLoadingCategory("");
    }
  };

  // Function to sync categories to the city document
  const syncCategories = async () => {
    if (!city || syncingCategories) return;

    // We need to have all businesses loaded to get all categories
    if (!allBusinessesLoaded) {
      toast.loading("Loading all businesses to extract categories...");
      await fetchBusinessesByCategory("all");
    }

    if (availableCategories.length === 0) {
      toast.error("No categories found to sync");
      return;
    }

    setSyncingCategories(true);
    const toastId = toast.loading("Syncing categories...");

    try {
      const cityDocRef = doc(db, "cities_summary", city);
      // Get current city data to preserve defaultCategory
      const cityDoc = await getDoc(cityDocRef);
      const currentDefault = cityDoc.exists()
        ? cityDoc.data().defaultCategory
        : null;

      // Update the city document with categories, preserving the default category
      await updateDoc(cityDocRef, {
        categories: availableCategories,
        defaultCategory: currentDefault, // Preserve the existing default category
        lastUpdated: new Date(),
      });

      setCityCategories(availableCategories);
      toast.success("Categories synced successfully", { id: toastId });
    } catch (error) {
      console.error("Error syncing categories:", error);
      toast.error("Failed to sync categories", { id: toastId });
    } finally {
      setSyncingCategories(false);
    }
  };

  // Handle category change
  const handleCategoryChange = async (category) => {
    console.log(`Changing category to: ${category}`);
    setCurrentCategory(category);
    setLoading(true);

    // Reset filters when changing category
    setFilters({
      ...filters,
      category: "", // Reset category filter since we're changing the whole dataset
    });

    try {
      await fetchBusinessesByCategory(category);
    } catch (error) {
      console.error(`Error in handleCategoryChange for ${category}:`, error);
      setLoading(false); // Ensure loading is set to false if the fetch fails
    }
  };

  // Function to extract area code from phone number
  const extractAreaCode = (phone) => {
    if (!phone) return null;
    // Match (XXX) or XXX pattern, handling more formats
    const match = phone.match(/\(?(\d{3})\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    console.log(
      "Phone:",
      phone,
      "Extracted area code:",
      match ? match[1] : null
    );
    return match ? match[1] : null;
  };

  // Filter businesses (using the currently loaded set)
  const filteredBusinesses = useMemo(() => {
    console.log("Filtering with search term:", filters.searchTerm);
    return businesses.filter((business) => {
      // Existing filters
      const searchTermLower = filters.searchTerm?.toLowerCase() || "";

      // Check if search term is a 3-digit number (area code)
      const isAreaCodeSearch = /^\d{3}$/.test(filters.searchTerm);

      // If it's an area code search, only check phone numbers
      if (isAreaCodeSearch) {
        const areaCode = extractAreaCode(business.phone);
        console.log(
          "Business:",
          business.name,
          "Phone:",
          business.phone,
          "Area Code:",
          areaCode
        );
        if (areaCode !== filters.searchTerm) {
          return false;
        }
      } else {
        // Regular search through other fields
        const matchesSearch =
          !filters.searchTerm ||
          business.name?.toLowerCase().includes(searchTermLower) ||
          business.category?.toLowerCase().includes(searchTermLower) ||
          business.address?.toLowerCase().includes(searchTermLower);

        if (!matchesSearch) return false;
      }

      const matchesCategory =
        !filters.category || business.category === filters.category;

      const matchesWebsiteStatus =
        !filters.websiteStatus ||
        business.website_status === filters.websiteStatus;

      const matchesPipelineStatus =
        !filters.pipelineStatus ||
        business.pipeline_status === filters.pipelineStatus;

      const matchesHideNoPhone = !filters.hideNoPhone || !!business.phone;

      const matchesHideNotQualified =
        !filters.hideNotQualified ||
        business.pipeline_status !== "Not Qualified";

      // Area code filter from dropdown
      const matchesAreaCode =
        !filters.areaCode ||
        extractAreaCode(business.phone) === filters.areaCode;

      return (
        matchesCategory &&
        matchesWebsiteStatus &&
        matchesPipelineStatus &&
        matchesHideNoPhone &&
        matchesHideNotQualified &&
        matchesAreaCode
      );
    });
  }, [businesses, filters]);

  // Get unique area codes from current businesses
  const availableAreaCodes = useMemo(() => {
    const areaCodes = new Set();
    businesses.forEach((business) => {
      const areaCode = extractAreaCode(business.phone);
      if (areaCode) areaCodes.add(areaCode);
    });
    return Array.from(areaCodes).sort();
  }, [businesses]);

  // Update filters state when BusinessTable filter inputs change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Function to handle CSV download
  const handleDownloadCSV = () => {
    if (filteredBusinesses.length === 0) {
      toast.error("No businesses to export.");
      return;
    }

    // Define CSV headers
    const headers = [
      "Name",
      "Category",
      "Address",
      "Phone",
      "Website",
      "Website Status",
      "Pipeline Status",
      "Notes",
      "Added Date",
      "Performance Score",
      "Performance Checked Date",
    ];

    // Convert business data to CSV rows
    const csvRows = filteredBusinesses.map((business) =>
      [
        `"${business.name || ""}"`, // Enclose in quotes to handle commas
        `"${business.category || ""}"`,
        `"${business.address || ""}"`,
        `"${business.phone || ""}"`,
        `"${business.website || ""}"`,
        `"${business.website_status || ""}"`,
        `"${business.pipeline_status || ""}"`,
        `"${(business.notes || "").replace(/"/g, '""')}"`, // Escape double quotes within notes
        `"${
          business.added_date?.toDate
            ? business.added_date.toDate().toLocaleDateString()
            : business.added_date || ""
        }"`, // Format Firestore Timestamp
        `"${business.performance_score ?? ""}"`, // Use nullish coalescing
        `"${
          business.performance_checked_date?.toDate
            ? business.performance_checked_date.toDate().toLocaleDateString()
            : business.performance_checked_date || ""
        }"`, // Format Firestore Timestamp
      ].join(",")
    );

    // Combine headers and rows
    const csvString = [headers.join(","), ...csvRows].join("\n");

    // Create a Blob and trigger download
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const safeCityName = city ? city.replace(/\s+/g, "_") : "businesses";
    link.setAttribute("download", `${safeCityName}_businesses.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export completed");
  };

  // Handle Bulk Performance Check
  const handleBulkCheckPerformance = async (selectedIds) => {
    if (!selectedIds || selectedIds.length === 0) {
      toast.error("No businesses selected.");
      return;
    }

    // 1. Filter selected businesses to get valid website URLs and IDs
    const businessesToCheck = businesses // Use current businesses
      .filter((b) => selectedIds.includes(b.id))
      .filter(
        (b) =>
          b.website &&
          b.website_status === "real" &&
          b.website.startsWith("http")
      ) // Basic check for real websites
      .map((b) => ({ id: b.id, website: b.website }));

    if (businessesToCheck.length === 0) {
      toast.error(
        "No selected businesses have valid websites for performance check."
      );
      return;
    }

    const plural = businessesToCheck.length > 1 ? "s" : "";
    const toastId = toast.loading(
      `Starting performance check for ${businessesToCheck.length} website${plural}...`
    );

    // 2. Send to the backend API
    try {
      const response = await fetch("/api/checkPerformance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businesses: businessesToCheck }), // Send the list of {id, website}
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "API request failed");
      }

      toast.success(
        `Performance check completed. ${result.checked || 0} checked, ${
          result.skipped || 0
        } skipped. Refreshing data...`,
        { id: toastId }
      );

      // Refresh only the current category
      await fetchBusinessesByCategory(currentCategory, true);
    } catch (error) {
      console.error("Error during bulk performance check:", error);
      toast.error(`Error: ${error.message}`, { id: toastId });
    }
  };

  // Format city name for display
  const formattedCity = useMemo(() => {
    if (!city) return "...";
    return city.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }, [city]);

  // Refresh the currently loaded category data
  const refreshCurrentCategory = async () => {
    setLoading(true);
    console.log(`Refreshing current category: ${currentCategory}`);

    try {
      // SAFETY CHECK: Never load "all" businesses unless explicitly selected by user
      // If current category is somehow set to "all" but we have a default category, use that instead
      let categoryToRefresh = currentCategory;

      if (currentCategory === "all") {
        console.log("Refresh requested for ALL businesses");

        // If we have a default category set, use that instead of "all" as a safety measure
        if (defaultCategory && cityCategories.includes(defaultCategory)) {
          console.log(
            `Safety override: Using default category "${defaultCategory}" instead of "all"`
          );
          categoryToRefresh = defaultCategory;
          // Update the UI to match what we're actually loading
          setCurrentCategory(defaultCategory);
        } else if (cityCategories.length > 0) {
          // If no default but we have categories, use the first one as a fallback
          console.log(
            `Safety override: Using first category "${cityCategories[0]}" instead of "all"`
          );
          categoryToRefresh = cityCategories[0];
          // Update the UI to match what we're actually loading
          setCurrentCategory(cityCategories[0]);
        }
        // Only if the user explicitly clicked "All Categories" and there's no safer alternative
        // will we actually refresh all businesses
      }

      console.log(`Actually refreshing category: ${categoryToRefresh}`);
      await fetchBusinessesByCategory(categoryToRefresh, true);

      toast.success(
        `Refreshed data for ${
          categoryToRefresh === "all"
            ? "all businesses"
            : `${categoryToRefresh} category`
        }`
      );
    } catch (error) {
      console.error("Error refreshing category:", error);
      toast.error("Failed to refresh data");
      setLoading(false);
    }
  };

  // Function to set default website filter
  const handleSetDefaultWebsiteFilter = async (filterValue) => {
    if (!city) return;

    const toastId = toast.loading(`Setting default website filter...`);

    try {
      const cityDocRef = doc(db, "cities_summary", city);

      await updateDoc(cityDocRef, {
        defaultWebsiteFilter: filterValue,
        lastUpdated: new Date(),
      });

      setDefaultWebsiteFilter(filterValue);
      toast.success(`Default website filter updated for ${formattedCity}`, {
        id: toastId,
      });
    } catch (error) {
      console.error("Error setting default website filter:", error);
      toast.error("Failed to set default website filter", { id: toastId });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Show login form for protected cities if not authenticated
  if (!isAuthenticated && isProtectedCity(router.query.city)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          <CityLoginForm
            city={router.query.city}
            onLoginSuccess={handleLoginSuccess}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>{formattedCity} - Businesses | Scraper Leads</title>
      </Head>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Link href="/" passHref>
              <button
                className="p-2 rounded-md hover:bg-gray-100"
                title="Back to Cities"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <h1 className="text-2xl font-semibold">
              Businesses in {formattedCity}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refreshCurrentCategory}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 text-sm"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
              disabled={filteredBusinesses.length === 0}
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
          </div>
        </div>

        {/* Categories and Sync UI */}
        <div className="mb-6 flex flex-col lg:flex-row gap-3 justify-between items-start border-b pb-4">
          <div>
            <h2 className="text-sm font-medium mb-2">Categories</h2>
            <div className="flex flex-wrap gap-2">
              {/* Regular categories first */}
              {cityCategories.map((category) => (
                <div key={category} className="flex items-center">
                  <button
                    onClick={() => handleCategoryChange(category)}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      currentCategory === category
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    } ${
                      defaultCategory === category
                        ? "border-2 border-yellow-400"
                        : ""
                    }`}
                    disabled={loadingCategory === category}
                  >
                    {loadingCategory === category ? "Loading..." : category}
                    {defaultCategory === category && (
                      <Star className="h-3 w-3 ml-1 text-yellow-300 inline" />
                    )}
                  </button>
                  {currentCategory === category && category !== "all" && (
                    <button
                      onClick={setCurrentCategoryAsDefault}
                      className={`ml-1 p-1 rounded-md text-xs ${
                        settingDefaultCategory
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : defaultCategory === category
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                      title={
                        defaultCategory === category
                          ? "This is already the default category"
                          : "Set as default category for this city"
                      }
                      disabled={
                        settingDefaultCategory || defaultCategory === category
                      }
                    >
                      <Star className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}

              {/* All Categories button at the end */}
              <button
                onClick={() => handleCategoryChange("all")}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  currentCategory === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-red-50 hover:bg-red-100 text-red-700"
                }`}
                disabled={loadingCategory === "all"}
              >
                {loadingCategory === "all" ? "Loading..." : "All Categories"}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {isLocalhost && (
              <button
                onClick={syncCategories}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  syncingCategories
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
                disabled={syncingCategories}
              >
                {syncingCategories ? "Syncing..." : "Sync Categories"}
              </button>
            )}
          </div>
        </div>

        {/* Add Area Code Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Area Code
          </label>
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.areaCode}
              onChange={(e) =>
                setFilters({ ...filters, areaCode: e.target.value })
              }
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Area Codes</option>
              {availableAreaCodes.map((code) => (
                <option key={code} value={code}>
                  ({code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        {!loading && businesses.length > 0 && (
          <div className="mb-6">
            <StatsCards stats={stats} />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <p className="ml-3">Loading businesses for {formattedCity}...</p>
          </div>
        ) : (
          <div>
            {/* Wrapper for count and table */}
            {/* Filtered Count Display */}
            <div className="text-sm text-gray-600 mb-3">
              Showing {filteredBusinesses.length} of {businesses.length}{" "}
              businesses in{" "}
              {currentCategory === "all"
                ? "all categories"
                : `"${currentCategory}" category`}
              {filters.searchTerm ||
              filters.category ||
              filters.websiteStatus ||
              filters.pipelineStatus ||
              filters.hideNoPhone ||
              filters.hideNotQualified
                ? " (filtered)"
                : ""}
            </div>
            <BusinessTable
              businesses={filteredBusinesses}
              onFilterChange={handleFilterChange}
              filters={filters}
              onRefresh={refreshCurrentCategory}
              onCheckPerformance={handleBulkCheckPerformance}
              city={city}
              defaultWebsiteFilter={defaultWebsiteFilter}
              onSetDefaultWebsiteFilter={handleSetDefaultWebsiteFilter}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
