"use client";

import { Building2, Edit } from "lucide-react";

export default function CityGrid({ cities, onSelectCity, onEdit, loading }) {
  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500">Loading cities...</div>
    );
  }

  if (!cities || cities.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        No city data found. Try recalculating city counts.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {cities.map((city) => (
        <div key={city.id} className="relative group">
          <button
            onClick={() => onSelectCity(city.id)}
            className="block p-4 bg-white border rounded-lg shadow hover:shadow-md transition-shadow text-left w-full h-full"
          >
            {city.imageUrl ? (
              <img
                src={city.imageUrl}
                alt={city.name}
                className="h-32 w-full object-cover rounded mb-2"
              />
            ) : (
              <div className="h-16 w-full bg-gray-200 rounded mb-2 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
            )}

            <h3
              className="font-semibold text-lg truncate"
              title={city.name || city.id}
            >
              {" "}
              {city.name || city.id}
            </h3>
            <p className="text-sm text-gray-600">
              {city.businessCount} businesses
            </p>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(city);
            }}
            title="Edit City Image"
            className="absolute top-1 right-1 p-1 bg-white bg-opacity-70 rounded-full text-gray-600 hover:bg-opacity-100 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
