"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import DashboardLayout from "../components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  ChevronRight,
  UserCheck,
  UserX,
  Clock,
  Phone,
  CheckCircle,
  ThumbsDown,
  RefreshCw,
  PhoneOff,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAnalyticsForDate,
  getAvailableAnalyticsDates,
  getCitiesForDate,
  getCityAnalytics,
} from "../firebase/analyticsTracker";
import {
  StatusBadge,
  StatusBadgeWithBorder,
} from "@/components/ui/status-badge";

// Define the date formatting helper function locally instead of importing
const formatDateForStorage = (date = new Date()) => {
  return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD format
};

export default function AnalyticsPage() {
  const [date, setDate] = useState(new Date());
  const [formattedDate, setFormattedDate] = useState(formatDateForStorage());
  const [availableDates, setAvailableDates] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [cityData, setCityData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Status color mappings for styling
  const statusColors = {
    "Not Contacted": "gray",
    Contacted: "blue",
    "Waiting Response": "orange",
    "No Answer": "yellow",
    "Action Required": "purple",
    "Closed / Won": "green",
    "Rejected / Not Interested": "red",
    "Not Qualified": "pink",
  };

  // Status icon mappings
  const statusIcons = {
    "Not Contacted": UserX,
    Contacted: Phone,
    "Waiting Response": Clock,
    "No Answer": PhoneOff,
    "Action Required": RefreshCw,
    "Closed / Won": CheckCircle,
    "Rejected / Not Interested": ThumbsDown,
    "Not Qualified": UserX,
  };

  // Load available dates when component mounts
  useEffect(() => {
    async function loadAvailableDates() {
      try {
        const dates = await getAvailableDates();
        setAvailableDates(dates);
      } catch (error) {
        console.error("Error loading available dates:", error);
      }
    }

    loadAvailableDates();
  }, []);

  // Load cities whenever date changes
  useEffect(() => {
    async function loadCitiesForDate() {
      setLoading(true);
      try {
        // Update formatted date for queries
        const newFormattedDate = formatDateForStorage(date);
        setFormattedDate(newFormattedDate);

        // Get cities for this date
        const cities = await getCitiesForDate(newFormattedDate);
        setAvailableCities(cities);

        // Reset selected city if it's no longer available
        if (selectedCity && !cities.includes(selectedCity)) {
          setSelectedCity(cities.length > 0 ? cities[0] : null);
        } else if (!selectedCity && cities.length > 0) {
          setSelectedCity(cities[0]);
        }
      } catch (error) {
        console.error("Error loading cities:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCitiesForDate();
  }, [date]);

  // Load city data when selected city changes
  useEffect(() => {
    async function loadCityData() {
      if (!selectedCity) {
        setCityData(null);
        return;
      }

      setLoading(true);
      try {
        const data = await getCityAnalytics(selectedCity, formattedDate);
        setCityData(data);
      } catch (error) {
        console.error("Error loading city data:", error);
        setCityData(null);
      } finally {
        setLoading(false);
      }
    }

    loadCityData();
  }, [selectedCity, formattedDate]);

  // Helper function to get available dates for calendar
  async function getAvailableDates() {
    try {
      return await getAvailableAnalyticsDates(60); // Get up to 60 days of data
    } catch (error) {
      console.error("Error fetching available dates:", error);
      return [];
    }
  }

  // Check if a date has analytics data available
  const hasDataForDate = (day) => {
    const formatted = formatDateForStorage(day);
    return availableDates.includes(formatted);
  };

  // Get total count for a specific status
  const getStatusCount = (status) => {
    if (!cityData || !cityData.statusCounts) return 0;
    return cityData.statusCounts[status] || 0;
  };

  // Calculate totals across all statuses
  const getTotalStatusCounts = () => {
    if (!cityData || !cityData.statusCounts) return 0;
    return Object.values(cityData.statusCounts).reduce(
      (sum, count) => sum + count,
      0
    );
  };

  // Get the date display in friendly format
  const getDateDisplay = () => {
    return format(date, "PPP"); // "April 29, 2023"
  };

  // Get a sample of most recent interactions
  const getRecentInteractions = () => {
    if (!cityData || !cityData.interactions) return [];
    // Sort by timestamp and get most recent 10
    return [...cityData.interactions]
      .sort((a, b) => {
        // Handle Firebase timestamps
        const timeA = a.timestamp?.seconds ? a.timestamp.seconds : 0;
        const timeB = b.timestamp?.seconds ? b.timestamp.seconds : 0;
        return timeB - timeA;
      })
      .slice(0, 10);
  };

  // Render the status icon
  const renderStatusIcon = (status) => {
    const Icon = statusIcons[status] || UserX;
    return <Icon className="h-4 w-4 mr-1" />;
  };

  return (
    <>
      <Head>
        <title>Lead Analytics | Scraper Leads</title>
        <meta
          name="description"
          content="Analytics for your lead generation activities"
        />
      </Head>

      <DashboardLayout>
        <div className="flex flex-col p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Lead Analytics</h1>
              <p className="text-muted-foreground">
                Track your lead generation activities over time
              </p>
            </div>

            {/* Date picker with calendar */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? getDateDisplay() : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => setDate(newDate || new Date())}
                  disabled={(date) => date > new Date()} // Can't select future dates
                  modifiers={{
                    hasData: hasDataForDate, // Highlight dates with data
                  }}
                  modifiersClassNames={{
                    hasData: "bg-blue-100 font-semibold",
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-gray-500">Loading analytics data...</p>
              </div>
            </div>
          ) : availableCities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center p-6">
                <h3 className="text-lg font-medium text-gray-900">
                  No data available
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  There is no analytics data for {getDateDisplay()}.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Analytics are recorded when you change pipeline statuses.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* City Selection Tabs */}
              <Tabs
                defaultValue={availableCities[0]}
                value={selectedCity}
                onValueChange={setSelectedCity}
                className="w-full"
              >
                <TabsList className="mb-4 flex flex-wrap">
                  {availableCities.map((city) => (
                    <TabsTrigger key={city} value={city} className="text-sm">
                      {city
                        .replace(/-/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {availableCities.map((city) => (
                  <TabsContent key={city} value={city} className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Contacted Card (was Total Interactions) */}
                      <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                            <Phone className="h-4 w-4 mr-1 text-blue-500" />
                            Contacted
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-600">
                            {cityData?.totalInteractions || 0}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Total lead interactions
                          </p>
                        </CardContent>
                      </Card>

                      {/* Closed/Won Card */}
                      <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                            Closed / Won
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {getStatusCount("Closed / Won")}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getTotalStatusCounts() > 0
                              ? `${Math.round(
                                  (getStatusCount("Closed / Won") /
                                    getTotalStatusCounts()) *
                                    100
                                )}% conversion rate`
                              : "No data yet"}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Rejected Card */}
                      <Card className="border-l-4 border-l-red-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                            <ThumbsDown className="h-4 w-4 mr-1 text-red-500" />
                            Rejected
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-600">
                            {getStatusCount("Rejected / Not Interested")}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getTotalStatusCounts() > 0
                              ? `${Math.round(
                                  (getStatusCount("Rejected / Not Interested") /
                                    getTotalStatusCounts()) *
                                    100
                                )}% rejection rate`
                              : "No data yet"}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Action Required Card */}
                      <Card className="border-l-4 border-l-purple-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                            <RefreshCw className="h-4 w-4 mr-1 text-purple-500" />
                            Action Required
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-purple-600">
                            {getStatusCount("Action Required")}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Leads needing follow-up
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Status Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Pipeline Status Distribution</CardTitle>
                        <CardDescription>
                          Status changes for {getDateDisplay()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {Object.keys(statusColors).map((status) => (
                            <div
                              key={status}
                              className="p-3 rounded-md border bg-card"
                            >
                              <div className="flex items-center justify-between">
                                <StatusBadge status={status} size="md" />
                                <span className="text-lg font-semibold">
                                  {getStatusCount(status)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Activity Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                          Most recent lead interactions for{" "}
                          {city
                            .replace(/-/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {getRecentInteractions().length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Business</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Previous Status</TableHead>
                                <TableHead>New Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getRecentInteractions().map(
                                (interaction, idx) => (
                                  <TableRow
                                    key={`${interaction.businessId}-${idx}`}
                                  >
                                    <TableCell className="font-medium">
                                      {interaction.businessName}
                                    </TableCell>
                                    <TableCell>
                                      {interaction.category}
                                    </TableCell>
                                    <TableCell>
                                      <StatusBadge
                                        status={interaction.previousStatus}
                                        size="sm"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <StatusBadge
                                        status={interaction.newStatus}
                                        size="sm"
                                      />
                                    </TableCell>
                                  </TableRow>
                                )
                              )}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">
                              No recent activities found
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
