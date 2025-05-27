"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ScraperControlPanel({ onStartScraper, isRunning }) {
  const [scraperParams, setScraperParams] = useState({
    city: "Park City",
    businessType: "Barber",
    maxResults: 20,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setScraperParams({
      ...scraperParams,
      [name]: name === "maxResults" ? Number.parseInt(value, 10) : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onStartScraper(scraperParams);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scraper Control Panel</CardTitle>
        <CardDescription>
          Configure and start your Google Maps scraping job
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City / Location</Label>
              <Input
                type="text"
                id="city"
                name="city"
                value={scraperParams.city}
                onChange={handleChange}
                required
                disabled={isRunning}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Input
                type="text"
                id="businessType"
                name="businessType"
                value={scraperParams.businessType}
                onChange={handleChange}
                required
                disabled={isRunning}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxResults">Max Results</Label>
              <Input
                type="number"
                id="maxResults"
                name="maxResults"
                value={scraperParams.maxResults}
                onChange={handleChange}
                min="1"
                max="500"
                required
                disabled={isRunning}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button type="submit" disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scraping in progress...
                </>
              ) : (
                "Start Scraping"
              )}
            </Button>

            {isRunning && (
              <div className="text-sm text-gray-500">
                This may take several minutes depending on the number of
                results.
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
