"use client";

import CitiesPage from "./cities";

// import { useState, useEffect } from "react";
// import Head from "next/head";
// import { Loader2, RefreshCw, Download } from "lucide-react";
// import { toast } from "react-hot-toast";
// import {
//   collection,
//   getDocs,
//   query,
//   where,
//   orderBy,
//   limit,
// } from "firebase/firestore";
// import { db } from "../firebase/clientApp";

// // Components
// import DashboardLayout from "../components/DashboardLayout";
// import ScraperControlPanel from "../components/ScraperControlPanel";
// import BusinessTable from "../components/BusinessTable";
// import StatsCards from "../components/StatsCards";
// import JobHistoryLog from "../components/JobHistoryLog";
// import { Button } from "@/components/ui/button";

const Home = () => {
  return <CitiesPage />;
};

export default Home;

// export default function Dashboard() {
//   const [businesses, setBusinesses] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [stats, setStats] = useState({
//     total: 0,
//     noWebsite: 0,
//     socialOnly: 0,
//     realWebsite: 0,
//     notContacted: 0,
//     contacted: 0,
//   });
//   const [filters, setFilters] = useState({
//     websiteStatus: "",
//     city: "",
//     businessType: "",
//     minRating: 0,
//     pipelineStatus: "",
//   });
//   const [jobHistory, setJobHistory] = useState([]);
//   const [isScraperRunning, setIsScraperRunning] = useState(false);

//   // Fetch job history on mount
//   useEffect(() => {
//     fetchJobHistory();
//   }, []);

//   // Fetch businesses - now primarily triggered by BusinessTable filters/refresh
//   const fetchBusinesses = async (currentFilters) => {
//     // Require at least one filter (e.g., city) to be set to fetch
//     if (!currentFilters || !currentFilters.city) {
//       // Or change logic if you want unfiltered view
//       console.log(
//         "Dashboard fetchBusinesses called without city filter. Clearing table."
//       );
//       setBusinesses([]);
//       setStats({
//         total: 0,
//         noWebsite: 0,
//         socialOnly: 0,
//         realWebsite: 0,
//         notContacted: 0,
//         contacted: 0,
//       });
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     console.log("Dashboard fetching businesses for filters:", currentFilters);
//     try {
//       let businessesQuery = collection(db, "businesses");

//       // Apply filters from argument
//       if (currentFilters.city) {
//         businessesQuery = query(
//           businessesQuery,
//           where("city", "==", currentFilters.city)
//         );
//       }
//       if (currentFilters.websiteStatus) {
//         businessesQuery = query(
//           businessesQuery,
//           where("website_status", "==", currentFilters.websiteStatus)
//         );
//       }
//       if (currentFilters.businessType) {
//         businessesQuery = query(
//           businessesQuery,
//           where("business_type", "==", currentFilters.businessType)
//         );
//       }
//       if (currentFilters.pipelineStatus) {
//         businessesQuery = query(
//           businessesQuery,
//           where("pipeline_status", "==", currentFilters.pipelineStatus)
//         );
//       }
//       if (currentFilters.minRating > 0) {
//         businessesQuery = query(
//           businessesQuery,
//           where("rating", ">=", currentFilters.minRating)
//         );
//       }

//       // Order by scraped_at date
//       businessesQuery = query(
//         businessesQuery,
//         orderBy("scraped_at", "desc"),
//         limit(500)
//       );

//       const querySnapshot = await getDocs(businessesQuery);
//       console.log(
//         `Dashboard found ${querySnapshot.size} businesses for filters.`
//       );

//       const businessList = [];
//       querySnapshot.forEach((doc) => {
//         businessList.push({
//           id: doc.id,
//           ...doc.data(),
//           pipeline_status: doc.data().pipeline_status || "Not Contacted",
//           notes: doc.data().notes || "",
//         });
//       });

//       setBusinesses(businessList);

//       // Calculate stats based on fetched businesses
//       const newStats = {
//         total: businessList.length,
//         noWebsite: businessList.filter((b) => b.website_status === "none")
//           .length,
//         socialOnly: businessList.filter(
//           (b) => b.website_status === "facebook/instagram"
//         ).length,
//         realWebsite: businessList.filter((b) => b.website_status === "real")
//           .length,
//         notContacted: businessList.filter(
//           (b) => b.pipeline_status === "Not Contacted"
//         ).length,
//         contacted: businessList.filter((b) => b.pipeline_status === "Contacted")
//           .length,
//       };
//       setStats(newStats);
//     } catch (error) {
//       console.error("Dashboard: Error fetching businesses:", error);
//       toast.error(`Failed to load businesses`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Fetch job history
//   const fetchJobHistory = async () => {
//     try {
//       const jobsQuery = query(
//         collection(db, "scraper_jobs"),
//         orderBy("timestamp", "desc"),
//         limit(5)
//       );

//       const querySnapshot = await getDocs(jobsQuery);

//       const jobs = [];
//       querySnapshot.forEach((doc) => {
//         jobs.push({
//           id: doc.id,
//           ...doc.data(),
//         });
//       });

//       setJobHistory(jobs);
//     } catch (error) {
//       console.error("Error fetching job history:", error);
//     }
//   };

//   // Start scraper
//   const startScraper = async (scraperParams) => {
//     setIsScraperRunning(true);

//     try {
//       const response = await fetch("/api/scrape", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(scraperParams),
//       });

//       const data = await response.json();

//       if (response.ok) {
//         toast.success(`Successfully started scraper job`);
//         fetchJobHistory();
//       } else {
//         toast.error(`Error: ${data.error || "Failed to run scraper"}`);
//       }
//     } catch (error) {
//       console.error("Error running scraper:", error);
//       toast.error("Failed to run scraper");
//     } finally {
//       setIsScraperRunning(false);
//     }
//   };

//   // Handle filter changes from BusinessTable
//   const handleFilterChange = (newFilters) => {
//     setFilters(newFilters); // Update local filter state
//     fetchBusinesses(newFilters); // Re-fetch businesses with new filters
//   };

//   // Export to CSV
//   const exportToCSV = () => {
//     if (businesses.length === 0) {
//       toast.error("No data to export");
//       return;
//     }

//     // Create CSV content
//     const headers = [
//       "Name",
//       "Category",
//       "Address",
//       "Phone",
//       "Rating",
//       "Reviews",
//       "Website",
//       "Website Status",
//       "Pipeline Status",
//       "Notes",
//       "City",
//       "Business Type",
//       "Scraped At",
//     ].join(",");

//     const rows = businesses.map((business) => {
//       return [
//         `"${(business.name || "").replace(/"/g, '""')}"`,
//         `"${(business.category || "").replace(/"/g, '""')}"`,
//         `"${(business.address || "").replace(/"/g, '""')}"`,
//         `"${(business.phone || "").replace(/"/g, '""')}"`,
//         business.rating || "",
//         business.reviews || "",
//         `"${(business.website || "").replace(/"/g, '""')}"`,
//         business.website_status || "",
//         `"${(business.pipeline_status || "").replace(/"/g, '""')}"`,
//         `"${(business.notes || "").replace(/"/g, '""')}"`,
//         `"${(business.city || "").replace(/"/g, '""')}"`,
//         `"${(business.business_type || "").replace(/"/g, '""')}"`,
//         business.scraped_at || "",
//       ].join(",");
//     });

//     const csv = [headers, ...rows].join("\n");

//     // Create download link
//     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.setAttribute("href", url);
//     link.setAttribute(
//       "download",
//       `businesses_export_${new Date().toISOString()}.csv`
//     );
//     link.style.visibility = "hidden";
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);

//     toast.success("Export completed");
//   };

//   return (
//     <>
//       <Head>
//         <title>Dashboard - Maps Scraper</title>
//         <meta
//           name="description"
//           content="Control panel and CRM for Google Maps scraper"
//         />
//       </Head>

//       <DashboardLayout>
//         <div className="flex flex-col gap-6 p-6">
//           <div className="flex flex-col md:flex-row justify-between items-start gap-4">
//             <div>
//               <h1 className="text-2xl font-bold">Scraper Dashboard</h1>
//               <p className="text-muted-foreground">
//                 Control your scraper and manage overall data.
//               </p>
//             </div>
//             <div className="flex gap-2">
//               {/* Maybe add a general refresh button later if needed */}
//               {/* Maybe add general export later? */}
//             </div>
//           </div>

//           {/* Main Dashboard Content */}
//           <>
//             {/* Stats Cards - Restore display */}
//             <StatsCards stats={stats} />

//             {/* Scraper Control Panel */}
//             <ScraperControlPanel
//               onStartScraper={startScraper}
//               isRunning={isScraperRunning}
//             />

//             {/* Job History */}
//             <JobHistoryLog jobs={jobHistory} />

//             {/* Business Table - Now potentially empty by default */}
//             <h2 className="text-xl font-semibold mt-4">Filtered Businesses</h2>
//             <p className="text-sm text-muted-foreground mb-2">
//               Apply filters in the table below or navigate via the Cities page
//               to view businesses.
//             </p>
//             <BusinessTable
//               businesses={businesses}
//               loading={loading}
//               onFilterChange={handleFilterChange}
//               filters={filters}
//               onRefresh={() => fetchBusinesses(filters)}
//             />
//           </>
//         </div>
//       </DashboardLayout>
//     </>
//   );
// }
