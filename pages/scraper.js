"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase/clientApp";
import DashboardLayout from "../components/DashboardLayout";
import ScraperControlPanel from "../components/ScraperControlPanel";
import JobHistoryLog from "../components/JobHistoryLog";
import LoginForm from "../components/LoginForm";
import { toast } from "react-hot-toast";

export default function ScraperPage() {
  const [jobHistory, setJobHistory] = useState([]);
  const [isScraperRunning, setIsScraperRunning] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
      fetchJobHistory();
    }
  }, []);

  // Handle successful login
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    fetchJobHistory();
  };

  // Fetch job history
  const fetchJobHistory = async () => {
    try {
      const jobsQuery = query(
        collection(db, "scraper_jobs"),
        orderBy("timestamp", "desc"),
        limit(10)
      );

      const querySnapshot = await getDocs(jobsQuery);

      const jobs = [];
      querySnapshot.forEach((doc) => {
        jobs.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setJobHistory(jobs);
    } catch (error) {
      console.error("Error fetching job history:", error);
    }
  };

  // Start scraper
  const startScraper = async (scraperParams) => {
    setIsScraperRunning(true);

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scraperParams),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Successfully started scraper job`);
        fetchJobHistory();
      } else {
        toast.error(`Error: ${data.error || "Failed to run scraper"}`);
      }
    } catch (error) {
      console.error("Error running scraper:", error);
      toast.error("Failed to run scraper");
    } finally {
      setIsScraperRunning(false);
    }
  };

  return (
    <>
      <Head>
        <title>Scraper Control | Google Maps Scraper</title>
        <meta name="description" content="Control your Google Maps scraper" />
      </Head>

      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          {!isAuthenticated ? (
            <LoginForm onLoginSuccess={handleLoginSuccess} />
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold">Scraper Control</h1>
                <p className="text-muted-foreground">
                  Configure and run your Google Maps scraper
                </p>
              </div>

              {/* Scraper Control Panel */}
              <ScraperControlPanel
                onStartScraper={startScraper}
                isRunning={isScraperRunning}
              />

              {/* Job History */}
              <JobHistoryLog jobs={jobHistory} />
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
