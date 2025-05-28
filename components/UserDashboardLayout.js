import { useState } from "react";
import { Building, LogOut, User, Star, Settings, Users } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function UserDashboardLayout({ children, user, onLogout }) {
  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem(`userAuth_${user.id}`);
    toast.success("Logged out successfully");
    onLogout();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-xl font-bold text-gray-900">
              My Business Portal
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Web Closer Dashboard Button */}
            {user?.webCloser && (
              <Link
                href={`/web-closer/${user.id}`}
                className="flex items-center px-3 py-2 text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
              >
                <Users className="h-4 w-4 mr-2" />
                Leads Dashboard
              </Link>
            )}

            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user.name || user.id}
                  {user.webCloser && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                      Web Closer
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{user.email || "User"}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 pt-16 overflow-auto">{children}</div>

      {/* Toast notifications */}
      <Toaster position="top-right" />
    </div>
  );
}
