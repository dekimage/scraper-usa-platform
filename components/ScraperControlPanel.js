"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="city"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            City / Location
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={scraperParams.city}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
            disabled={isRunning}
          />
        </div>

        <div>
          <label
            htmlFor="businessType"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Business Type
          </label>
          <input
            type="text"
            id="businessType"
            name="businessType"
            value={scraperParams.businessType}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
            disabled={isRunning}
          />
        </div>

        <div>
          <label
            htmlFor="maxResults"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Max Results
          </label>
          <input
            type="number"
            id="maxResults"
            name="maxResults"
            value={scraperParams.maxResults}
            onChange={handleChange}
            min="1"
            max="500"
            className="w-full p-2 border rounded-md"
            required
            disabled={isRunning}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="submit"
          className={`px-4 py-2 rounded-md text-white ${
            isRunning
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 className="inline-block h-4 w-4 mr-2 animate-spin" />
              Scraping in progress...
            </>
          ) : (
            "Start Scraping"
          )}
        </button>

        {isRunning && (
          <div className="text-sm text-gray-500">
            This may take several minutes depending on the number of results.
          </div>
        )}
      </div>
    </form>
  );
}
