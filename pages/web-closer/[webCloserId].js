import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Loader2, RefreshCw, Star, Users, ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";

// Components
import UserLoginForm from "../../components/UserLoginForm";
import UserDashboardLayout from "../../components/UserDashboardLayout";
import UserBusinessTable from "../../components/UserBusinessTable";
import StatsCards from "../../components/StatsCards";

export default function WebCloserPage() {
  const router = useRouter();
  const { webCloserId } = router.query;

  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [businesses, setBusinesses] = useState([]);
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [receivedLeads, setReceivedLeads] = useState({});
  const [usersWithLeads, setUsersWithLeads] = useState([]);
  const [selectedFromUser, setSelectedFromUser] = useState("");
  const [totalBusinesses, setTotalBusinesses] = useState(0);

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
    if (!webCloserId) return;

    const checkAuth = () => {
      const authData = localStorage.getItem(`userAuth_${webCloserId}`);
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
            if (userData.webCloser) {
              setUser(userData);
              setIsAuthenticated(true);
            } else {
              toast.error("Access denied. You are not a web closer.");
              localStorage.removeItem(`userAuth_${webCloserId}`);
            }
          } else {
            // Session expired
            localStorage.removeItem(`userAuth_${webCloserId}`);
          }
        } catch (error) {
          console.error("Error parsing auth data:", error);
          localStorage.removeItem(`userAuth_${webCloserId}`);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [webCloserId]);

  // Fetch received leads overview when authenticated
  useEffect(() => {
    if (!isAuthenticated || !webCloserId || !user) return;

    fetchReceivedLeadsOverview();
  }, [isAuthenticated, webCloserId, user]);

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

  // Function to fetch received leads overview
  const fetchReceivedLeadsOverview = async () => {
    try {
      const response = await fetch(
        `/api/getReceivedLeads?webCloserId=${webCloserId}`
      );
      const data = await response.json();

      if (response.ok) {
        setReceivedLeads(data.receivedLeads || {});
        setUsersWithLeads(data.usersWithLeads || []);
        setTotalBusinesses(data.totalBusinesses || 0);
      } else {
        toast.error(data.error || "Failed to fetch received leads");
      }
    } catch (error) {
      console.error("Error fetching received leads:", error);
      toast.error("Failed to fetch received leads");
    }
  };

  // Function to fetch businesses from a specific user
  const fetchBusinessesFromUser = async (fromUserId) => {
    if (!fromUserId) {
      setBusinesses([]);
      setStats(calculateStats([]));
      return;
    }

    setBusinessesLoading(true);

    try {
      const response = await fetch(
        `/api/getReceivedLeads?webCloserId=${webCloserId}&fromUserId=${fromUserId}`
      );
      const data = await response.json();

      if (response.ok) {
        const businessesData = data.businesses || [];
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

  // Handle user selection change
  const handleUserChange = async (fromUserId) => {
    setSelectedFromUser(fromUserId);
    await fetchBusinessesFromUser(fromUserId);
  };

  // Handle login success
  const handleLoginSuccess = (userData) => {
    if (userData.webCloser) {
      setUser(userData);
      setIsAuthenticated(true);
    } else {
      toast.error("Access denied. You are not a web closer.");
    }
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setBusinesses([]);
    setReceivedLeads({});
    setUsersWithLeads([]);
    setSelectedFromUser("");
    router.push("/");
  };

  // Handle refresh
  const handleRefresh = async () => {
    await fetchReceivedLeadsOverview();
    if (selectedFromUser) {
      await fetchBusinessesFromUser(selectedFromUser);
    }
    toast.success("Data refreshed");
  };

  // Handle updating user preferences (placeholder for compatibility)
  const handleUpdateUserPreferences = async (preferences) => {
    // This is a placeholder to maintain compatibility with UserBusinessTable
    // Web closers might not need the same preference system
    console.log("Web closer preferences update:", preferences);
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
        <title>
          {user?.name || webCloserId} - Web Closer Dashboard | Business Portal
        </title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Web Closer Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {user?.name || webCloserId}
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

        {/* Overview Stats */}
        <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-medium mb-4">Received Leads Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {totalBusinesses}
              </div>
              <div className="text-sm text-gray-600">Total Businesses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {usersWithLeads.length}
              </div>
              <div className="text-sm text-gray-600">
                Users Who Passed Leads
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {selectedFromUser ? businesses.length : 0}
              </div>
              <div className="text-sm text-gray-600">Currently Viewing</div>
            </div>
          </div>
        </div>

        {/* User Selection */}
        <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-medium mb-4">
            Select User to View Leads
          </h2>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose a user who passed leads to you:
              </label>
              <select
                value={selectedFromUser}
                onChange={(e) => handleUserChange(e.target.value)}
                className="w-full p-2 border rounded-md"
                disabled={businessesLoading}
              >
                <option value="">Select a user...</option>
                {usersWithLeads.map((userWithLeads) => (
                  <option key={userWithLeads.id} value={userWithLeads.id}>
                    {userWithLeads.name} ({userWithLeads.businessCount}{" "}
                    businesses)
                    {userWithLeads.email && ` - ${userWithLeads.email}`}
                  </option>
                ))}
              </select>
            </div>
            {selectedFromUser && (
              <button
                onClick={() => handleUserChange("")}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-md hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Clear Selection
              </button>
            )}
          </div>
        </div>

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
        ) : !selectedFromUser ? (
          <div className="text-center py-20">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              Select a user from the dropdown above to view their passed
              businesses.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              You have received leads from {usersWithLeads.length} user
              {usersWithLeads.length !== 1 ? "s" : ""}.
            </p>
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">
              No businesses found from this user.
            </p>
          </div>
        ) : (
          <div>
            {/* Business count */}
            <div className="text-sm text-gray-600 mb-3">
              Showing {businesses.length} businesses passed by{" "}
              {usersWithLeads.find((u) => u.id === selectedFromUser)?.name ||
                selectedFromUser}
            </div>

            {/* Business Table */}
            <UserBusinessTable
              businesses={businesses}
              loading={businessesLoading}
              user={user}
              onUpdateUserPreferences={handleUpdateUserPreferences}
            />
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}
