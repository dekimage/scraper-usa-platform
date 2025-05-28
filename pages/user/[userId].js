import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Loader2, RefreshCw, Star } from "lucide-react";
import { toast } from "react-hot-toast";

// Components
import UserLoginForm from "../../components/UserLoginForm";
import UserDashboardLayout from "../../components/UserDashboardLayout";
import UserBusinessTable from "../../components/UserBusinessTable";
import StatsCards from "../../components/StatsCards";

export default function UserPage() {
  const router = useRouter();
  const { userId } = router.query;

  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [businesses, setBusinesses] = useState([]);
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [businessesByCategory, setBusinessesByCategory] = useState({});

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    noWebsite: 0,
    socialOnly: 0,
    realWebsite: 0,
    notContacted: 0,
    contacted: 0,
  });

  // Check authentication on mount
  useEffect(() => {
    if (!userId) return;

    const checkAuth = () => {
      const authData = localStorage.getItem(`userAuth_${userId}`);
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          // Check if login is not too old (optional: 24 hours)
          const loginTime = new Date(parsed.loginTime);
          const now = new Date();
          const hoursDiff = (now - loginTime) / (1000 * 60 * 60);

          if (hoursDiff < 24) {
            // 24 hour session
            const userData = parsed.userData;
            setUser(userData);
            setIsAuthenticated(true);

            // Redirect web closers to their leads dashboard
            if (userData.webCloser) {
              router.push(`/web-closer/${userId}`);
              return;
            }
          } else {
            // Session expired
            localStorage.removeItem(`userAuth_${userId}`);
          }
        } catch (error) {
          console.error("Error parsing auth data:", error);
          localStorage.removeItem(`userAuth_${userId}`);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [userId, router]);

  // Fetch user's categories when authenticated
  useEffect(() => {
    if (!isAuthenticated || !userId || !user) return;

    const fetchUserCategories = async () => {
      try {
        const response = await fetch(`/api/getUserBusinesses?userId=${userId}`);
        const data = await response.json();

        if (response.ok) {
          setAvailableCategories(data.categories || []);

          // Set default category from user preferences or first available
          const defaultCategory = user?.preferences?.defaultCategory;
          const categoryToLoad =
            defaultCategory && data.categories.includes(defaultCategory)
              ? defaultCategory
              : data.categories[0];

          if (categoryToLoad) {
            setCurrentCategory(categoryToLoad);
            await fetchBusinessesByCategory(categoryToLoad);
          }
        } else {
          toast.error(data.error || "Failed to fetch categories");
        }
      } catch (error) {
        console.error("Error fetching user categories:", error);
        toast.error("Failed to fetch categories");
      }
    };

    fetchUserCategories();
  }, [isAuthenticated, userId, user]);

  // Function to calculate stats from businesses
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
      ).length,
    };
  };

  // Function to fetch businesses for a specific category
  const fetchBusinessesByCategory = async (category, forceRefresh = false) => {
    if (!userId || !category) return;

    // Use cached data if available and not forcing refresh
    if (businessesByCategory[category] && !forceRefresh) {
      setBusinesses(businessesByCategory[category]);
      setStats(calculateStats(businessesByCategory[category]));
      return;
    }

    setBusinessesLoading(true);

    try {
      const response = await fetch(
        `/api/getUserBusinesses?userId=${userId}&category=${encodeURIComponent(
          category
        )}`
      );
      const data = await response.json();

      if (response.ok) {
        const businessesData = data.businesses || [];

        // Cache the results
        setBusinessesByCategory((prev) => ({
          ...prev,
          [category]: businessesData,
        }));

        setBusinesses(businessesData);
        setStats(calculateStats(businessesData));
      } else {
        toast.error(data.error || "Failed to fetch businesses");
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
      toast.error("Failed to fetch businesses");
    } finally {
      setBusinessesLoading(false);
    }
  };

  // Handle category change
  const handleCategoryChange = async (category) => {
    setCurrentCategory(category);
    await fetchBusinessesByCategory(category);
  };

  // Handle login success
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);

    // Redirect web closers to their leads dashboard
    if (userData.webCloser) {
      router.push(`/web-closer/${userId}`);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setBusinesses([]);
    setAvailableCategories([]);
    setCurrentCategory(null);
    setBusinessesByCategory({});
    router.push("/");
  };

  // Handle refresh current category
  const handleRefresh = async () => {
    if (currentCategory) {
      await fetchBusinessesByCategory(currentCategory, true);
      toast.success("Data refreshed");
    }
  };

  // Handle updating user preferences
  const handleUpdateUserPreferences = async (preferences) => {
    try {
      const response = await fetch("/api/updateUserPreferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          preferences: preferences,
        }),
      });

      if (response.ok) {
        // Update local user data
        setUser((prev) => ({
          ...prev,
          preferences: preferences,
        }));

        // Update localStorage
        const authData = localStorage.getItem(`userAuth_${userId}`);
        if (authData) {
          const parsed = JSON.parse(authData);
          parsed.userData.preferences = preferences;
          localStorage.setItem(`userAuth_${userId}`, JSON.stringify(parsed));
        }
      } else {
        throw new Error("Failed to update preferences");
      }
    } catch (error) {
      console.error("Error updating preferences:", error);
      throw error;
    }
  };

  // Handle setting current category as default
  const handleSetDefaultCategory = async () => {
    if (!currentCategory) return;

    try {
      const currentPreferences = user?.preferences || {};
      const updatedPreferences = {
        ...currentPreferences,
        defaultCategory: currentCategory,
      };

      await handleUpdateUserPreferences(updatedPreferences);
      toast.success(`"${currentCategory}" set as default category`);
    } catch (error) {
      toast.error("Failed to set default category");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <UserLoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <UserDashboardLayout user={user} onLogout={handleLogout}>
      <Head>
        <title>{user?.name || userId} - My Businesses | Business Portal</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">My Assigned Businesses</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {user?.name || userId}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 text-sm"
              disabled={businessesLoading}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Categories Navigation */}
        {availableCategories.length > 0 && (
          <div className="mb-6 flex flex-col lg:flex-row gap-3 justify-between items-start border-b pb-4">
            <div>
              <h2 className="text-sm font-medium mb-2">My Categories</h2>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => {
                  const isDefault =
                    user?.preferences?.defaultCategory === category;
                  const isActive = currentCategory === category;

                  return (
                    <div key={category} className="flex items-center">
                      <button
                        onClick={() => handleCategoryChange(category)}
                        className={`px-3 py-1.5 text-sm rounded-md ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        } ${isDefault ? "border-2 border-yellow-400" : ""}`}
                        disabled={businessesLoading}
                      >
                        {category}
                        {isDefault && (
                          <Star className="h-3 w-3 ml-1 text-yellow-300 inline" />
                        )}
                      </button>
                      {isActive && !isDefault && (
                        <button
                          onClick={handleSetDefaultCategory}
                          className="ml-1 p-1 rounded-md text-xs bg-gray-100 hover:bg-gray-200 text-gray-700"
                          title="Set as default category"
                        >
                          <Star className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {!businessesLoading && businesses.length > 0 && (
          <div className="mb-6">
            <StatsCards stats={stats} />
          </div>
        )}

        {/* Main Content */}
        {businessesLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <p className="ml-3">Loading businesses...</p>
          </div>
        ) : availableCategories.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">
              No businesses have been assigned to you yet.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Contact your administrator to get access to businesses.
            </p>
          </div>
        ) : currentCategory ? (
          <div>
            {/* Business count */}
            <div className="text-sm text-gray-600 mb-3">
              Showing {businesses.length} businesses in "{currentCategory}"
              category
            </div>

            {/* Business Table */}
            <UserBusinessTable
              businesses={businesses}
              loading={businessesLoading}
              user={user}
              onUpdateUserPreferences={handleUpdateUserPreferences}
            />
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">
              Select a category to view your businesses.
            </p>
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}
