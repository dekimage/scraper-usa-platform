"use client"

import { useState } from "react"
import Link from "next/link"
import { BarChart, Map, Settings, Menu, X, Home, Database } from "lucide-react"

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar toggle */}
      <div className="fixed top-0 left-0 z-40 lg:hidden">
        <button
          className="p-2 m-2 text-gray-600 bg-white rounded-md shadow-sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 border-b">
            <h1 className="text-xl font-bold">Maps Scraper CRM</h1>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <Link href="/" className="flex items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100">
              <Home className="h-5 w-5 mr-3" />
              Dashboard
            </Link>
            <Link href="/businesses" className="flex items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100">
              <Database className="h-5 w-5 mr-3" />
              Businesses
            </Link>
            <Link href="/scraper" className="flex items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100">
              <Map className="h-5 w-5 mr-3" />
              Scraper
            </Link>
            <Link href="/analytics" className="flex items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100">
              <BarChart className="h-5 w-5 mr-3" />
              Analytics
            </Link>
            <Link href="/settings" className="flex items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100">
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </Link>
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <div className="ml-3">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-gray-500">admin@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto lg:ml-64">{children}</div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  )
}
