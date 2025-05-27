"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import {
  Loader2,
  Calendar as CalendarIcon,
  User,
  Activity,
  FileText,
  TrendingUp,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import DashboardLayout from "../components/DashboardLayout";
import AdminLoginForm from "../components/AdminLoginForm";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  getUserAnalyticsForDate,
  getUserAvailableAnalyticsDates,
  formatDateForStorage,
} from "../firebase/userAnalyticsTracker";

export default function UserAnalyticsPage() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [analyticsData, setAnalyticsData] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check admin authentication on mount
  useEffect(() => {
    const checkAdminAuth = () => {
      const adminAuth = localStorage.getItem("adminAuth");
      if (adminAuth) {
        try {
          const parsed = JSON.parse(adminAuth);
          const loginTime = new Date(parsed.loginTime);
          const now = new Date();
          const hoursDiff = (now - loginTime) / (1000 * 60 * 60);

          if (hoursDiff < 24 && parsed.isAdmin) {
            setIsAdminAuthenticated(true);
          } else {
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

  // Fetch users when authenticated
  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchUsers();
    }
  }, [isAdminAuthenticated]);

  // Fetch analytics when user or date changes
  useEffect(() => {
    if (selectedUser && selectedDate) {
      fetchUserAnalytics();
      fetchAvailableDates();
    }
  }, [selectedUser, selectedDate]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/getUsers");
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || []);
        if (data.users.length > 0 && !selectedUser) {
          setSelectedUser(data.users[0].id);
        }
      } else {
        toast.error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    }
  };

  const fetchUserAnalytics = async () => {
    if (!selectedUser || !selectedDate) return;

    setLoading(true);
    try {
      const dateFormatted = formatDateForStorage(selectedDate);
      const data = await getUserAnalyticsForDate(selectedUser, dateFormatted);
      setAnalyticsData(data);
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      toast.error("Failed to fetch analytics data");
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDates = async () => {
    if (!selectedUser) return;

    try {
      const dates = await getUserAvailableAnalyticsDates(selectedUser, 60);
      setAvailableDates(dates);
    } catch (error) {
      console.error("Error fetching available dates:", error);
      setAvailableDates([]);
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
  };

  const hasDataForDate = (date) => {
    const formatted = formatDateForStorage(date);
    return availableDates.includes(formatted);
  };

  const getDateDisplay = () => {
    return format(selectedDate, "PPP");
  };

  const getInteractionsByType = (type) => {
    if (!analyticsData?.interactions) return [];
    return analyticsData.interactions.filter(
      (interaction) => interaction.actionType === type
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Unknown time";

    // Handle Firebase timestamp or regular Date
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return format(date, "HH:mm:ss");
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
        <title>User Analytics | Admin Dashboard</title>
        <meta
          name="description"
          content="View individual user performance analytics"
        />
      </Head>

      <DashboardLayout>
        <div className="flex flex-col p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">User Analytics Dashboard</h1>
              <p className="text-muted-foreground">
                Track individual user performance and daily activities
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* User Selection */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-64 p-2 border rounded-md"
              >
                <option value="">Choose a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.id} {user.email && `(${user.email})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selection */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Select Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-64 justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? getDateDisplay() : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setSelectedDate(date || new Date())}
                    disabled={(date) => date > new Date()}
                    modifiers={{
                      hasData: hasDataForDate,
                    }}
                    modifiersClassNames={{
                      hasData: "bg-blue-100 font-semibold",
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Analytics Content */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                <p className="mt-4 text-gray-500">Loading analytics data...</p>
              </div>
            </div>
          ) : !selectedUser ? (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border">
              <User className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                Select a User
              </h3>
              <p className="text-sm text-gray-500">
                Choose a user to view their analytics
              </p>
            </div>
          ) : !analyticsData ? (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border">
              <Activity className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                No Data Available
              </h3>
              <p className="text-sm text-gray-500">
                No analytics data found for{" "}
                {users.find((u) => u.id === selectedUser)?.name || selectedUser}{" "}
                on {getDateDisplay()}
              </p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-blue-500" />
                      Total Interactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {analyticsData.totalInteractions || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      All business interactions
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                      Status Changes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {analyticsData.statusChanges || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pipeline status updates
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-purple-500" />
                      Notes Updates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {analyticsData.notesUpdates || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Notes added/updated
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                      <User className="h-4 w-4 mr-2 text-orange-500" />
                      Categories Worked
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {Object.keys(analyticsData.categoryCounts || {}).length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Different categories
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Interactions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Changes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Status Changes</CardTitle>
                    <CardDescription>
                      Pipeline status updates for {getDateDisplay()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getInteractionsByType("status_change").length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Business</TableHead>
                            <TableHead>From → To</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getInteractionsByType("status_change").map(
                            (interaction, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono text-sm">
                                  {formatTime(interaction.timestamp)}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {interaction.businessName}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {interaction.category} •{" "}
                                      {interaction.city}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <span className="text-red-600">
                                      {interaction.previousStatus}
                                    </span>
                                    <span className="mx-2">→</span>
                                    <span className="text-green-600">
                                      {interaction.newStatus}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No status changes recorded
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notes Updates */}
                <Card>
                  <CardHeader>
                    <CardTitle>Notes Updates</CardTitle>
                    <CardDescription>
                      Notes added or updated for {getDateDisplay()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getInteractionsByType("notes_update").length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Business</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getInteractionsByType("notes_update").map(
                            (interaction, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono text-sm">
                                  {formatTime(interaction.timestamp)}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {interaction.businessName}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {interaction.category} •{" "}
                                      {interaction.city}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div
                                    className="text-sm max-w-xs truncate"
                                    title={interaction.notes}
                                  >
                                    {interaction.notes || "Empty note"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {interaction.notesLength || 0} characters
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No notes updates recorded
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Category and City Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Category Breakdown</CardTitle>
                    <CardDescription>
                      Interactions by business category
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analyticsData.categoryCounts || {}).map(
                        ([category, count]) => (
                          <div
                            key={category}
                            className="flex justify-between items-center"
                          >
                            <span className="text-sm">{category}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* City Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>City Breakdown</CardTitle>
                    <CardDescription>Interactions by city</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analyticsData.cityCounts || {}).map(
                        ([city, count]) => (
                          <div
                            key={city}
                            className="flex justify-between items-center"
                          >
                            <span className="text-sm">{city}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
