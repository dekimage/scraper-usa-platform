"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MoreHorizontal,
  Edit,
  Star,
  Filter,
  Search,
  Globe,
  XCircle,
  Share2,
  Facebook,
  Instagram,
  Layers,
  RefreshCw,
  Send,
  Clock,
  CheckCircle,
  ThumbsDown,
  Slash,
  UserX,
  List,
  Phone,
  PhoneOff,
  ClipboardCopy,
  ImageOff,
  Copy,
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/clientApp";
import { toast } from "react-hot-toast";
import { recordPipelineStatusChange } from "../firebase/analyticsTracker";

// Pipeline status options & styling
const PIPELINE_STATUSES_CONFIG = {
  "Not Contacted": { color: "gray", icon: UserX, bgColor: "bg-white" },
  Contacted: { color: "blue", icon: Send, bgColor: "bg-green-50" },
  "Waiting Response": { color: "orange", icon: Clock, bgColor: "bg-blue-50" },
  "No Answer": { color: "yellow", icon: PhoneOff, bgColor: "bg-purple-50" },
  "Action Required": {
    color: "purple",
    icon: RefreshCw,
    bgColor: "bg-yellow-50",
  },
  "Closed / Won": {
    color: "green",
    icon: CheckCircle,
    bgColor: "bg-green-100",
  },
  "Rejected / Not Interested": {
    color: "red",
    icon: ThumbsDown,
    bgColor: "bg-red-50",
  },
  "Not Qualified": { color: "purple", icon: Slash, bgColor: "bg-white" },
};
const PIPELINE_STATUSES = Object.keys(PIPELINE_STATUSES_CONFIG);

// Website status display mapping
const WEBSITE_STATUS_DISPLAY = {
  none: "No Website",
  "facebook/instagram": "Social Media Only",
  real: "Real Website",
};

// Website filters with metadata
const WEBSITE_FILTERS = {
  "": { label: "All", icon: Layers, color: "gray" },
  none: { label: "No Website", icon: XCircle, color: "green" },
  "facebook/instagram": { label: "Social Only", icon: Share2, color: "yellow" },
  real: { label: "Real Website", icon: Globe, color: "red" },
};

export default function BusinessTable({
  businesses,
  loading,
  onFilterChange,
  filters,
  onRefresh,
  onCheckPerformance,
  city,
  defaultWebsiteFilter,
  onSetDefaultWebsiteFilter,
}) {
  const [selectedBusinesses, setSelectedBusinesses] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    ...filters,
    hideNoPhone: filters.hideNoPhone !== undefined ? filters.hideNoPhone : true,
  });
  const [editingNotes, setEditingNotes] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [showUserAssignModal, setShowUserAssignModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [assigningToUser, setAssigningToUser] = useState(false);
  const [forceRender, setForceRender] = useState(0); // Force re-render state

  // Update local filters if the parent filters change (e.g., city change, reset)
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Fetch available users when modal opens
  useEffect(() => {
    if (showUserAssignModal && availableUsers.length === 0) {
      fetchUsers();
    }
  }, [showUserAssignModal]);

  // Function to fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/getUsers");
      const data = await response.json();
      if (response.ok) {
        setAvailableUsers(data.users || []);
      } else {
        toast.error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    }
  };

  // Calculate unique categories dynamically
  const uniqueCategories = useMemo(() => {
    if (!businesses || businesses.length === 0) {
      return [];
    }
    const categories = new Set(
      businesses.map((b) => b.category).filter(Boolean)
    ); // filter(Boolean) removes null/undefined
    return Array.from(categories).sort();
  }, [businesses]);

  const itemsPerPage = 50;

  // Reset page when businesses (filtered list from parent) change
  useEffect(() => {
    setCurrentPage(1);
  }, [businesses]);

  // Function to extract area code from phone number
  const extractAreaCode = (phone) => {
    if (!phone) return null;
    const match = phone.match(/\(?(\d{3})\)?/);
    return match ? match[1] : null;
  };

  // Sort function
  const sortData = (data) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Special handling for phone numbers (area code sorting)
      if (sortConfig.key === "phone") {
        aValue = extractAreaCode(aValue);
        bValue = extractAreaCode(bValue);
      }

      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  };

  // Request sort function
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Get sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? " ↑" : " ↓";
  };

  // Sort the businesses
  const sortedBusinesses = useMemo(
    () => sortData(businesses),
    [businesses, sortConfig]
  );

  // Paginate businesses
  const paginatedBusinesses = useMemo(() => {
    return sortedBusinesses.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sortedBusinesses, currentPage, itemsPerPage]);

  // Total pages
  const totalPages = Math.ceil(sortedBusinesses.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedBusinesses(paginatedBusinesses.map((business) => business.id));
    } else {
      setSelectedBusinesses([]);
    }
  };

  // Handle select one
  const handleSelectOne = (id) => {
    if (selectedBusinesses.includes(id)) {
      setSelectedBusinesses(
        selectedBusinesses.filter((businessId) => businessId !== id)
      );
    } else {
      setSelectedBusinesses([...selectedBusinesses, id]);
    }
  };

  // Handle pipeline status change (Single Business)
  const handleStatusChange = async (businessId, status) => {
    const toastId = toast.loading(`Updating status to "${status}"...`);

    // Find the business data for analytics tracking
    const business = businesses.find((b) => b.id === businessId);
    if (!business) {
      toast.error("Business not found", { id: toastId });
      return;
    }

    const previousStatus = business.pipeline_status || "Not Contacted";

    try {
      // Update the local business in-memory FIRST for instant UI update
      business.pipeline_status = status;

      // Force React to re-render by updating dummy state
      setForceRender((prev) => prev + 1);

      // Only track analytics if status actually changed
      if (previousStatus !== status) {
        recordPipelineStatusChange({
          businessId,
          businessName: business.name,
          category: business.category,
          city: business.city,
          previousStatus,
          newStatus: status,
        });
      }

      // Update Firebase in the background
      await updateDoc(doc(db, "businesses", businessId), {
        pipeline_status: status,
      });

      toast.success(`Updated status to "${status}"`, { id: toastId });
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status", { id: toastId });

      // Revert the local change if Firebase update failed
      business.pipeline_status = previousStatus;

      // Force another re-render to show the reverted state
      setForceRender((prev) => prev + 1);
    }
  };

  // Handle bulk update (Pipeline Status)
  const handleBulkUpdate = async (status) => {
    if (selectedBusinesses.length === 0) {
      toast.error("No businesses selected");
      return;
    }
    const toastId = toast.loading(
      `Updating ${selectedBusinesses.length} businesses...`
    );

    // Get the selected businesses data for analytics tracking
    const selectedBusinessesData = businesses.filter((b) =>
      selectedBusinesses.includes(b.id)
    );

    // Store previous statuses for potential rollback
    const previousStatuses = selectedBusinessesData.map((business) => ({
      id: business.id,
      previousStatus: business.pipeline_status || "Not Contacted",
    }));

    try {
      // Update statuses in local state FIRST for instant UI update
      selectedBusinessesData.forEach((business) => {
        business.pipeline_status = status;
      });

      // Force React to re-render by updating dummy state
      setForceRender((prev) => prev + 1);

      const updatePromises = selectedBusinessesData.map((business) => {
        const previousStatusObj = previousStatuses.find(
          (p) => p.id === business.id
        );
        const previousStatus = previousStatusObj
          ? previousStatusObj.previousStatus
          : "Not Contacted";

        // Only track if status actually changed
        if (previousStatus !== status) {
          recordPipelineStatusChange({
            businessId: business.id,
            businessName: business.name,
            category: business.category,
            city: business.city,
            previousStatus,
            newStatus: status,
          });
        }

        // Update the business in Firestore
        return updateDoc(doc(db, "businesses", business.id), {
          pipeline_status: status,
        });
      });

      await Promise.all(updatePromises);

      toast.success(
        `Updated ${selectedBusinesses.length} businesses to "${status}"`,
        { id: toastId }
      );
      setSelectedBusinesses([]);
      // Do NOT call onRefresh() here to avoid expensive refetching
    } catch (error) {
      console.error("Error bulk updating businesses:", error);
      toast.error("Failed to update businesses", { id: toastId });

      // Revert the local changes if Firebase update failed
      selectedBusinessesData.forEach((business) => {
        const previousStatusObj = previousStatuses.find(
          (p) => p.id === business.id
        );
        business.pipeline_status = previousStatusObj
          ? previousStatusObj.previousStatus
          : "Not Contacted";
      });

      // Force another re-render to show the reverted state
      setForceRender((prev) => prev + 1);
    }
  };

  // Handle notes edit
  const handleEditNotes = (business) => {
    setEditingNotes(business.id);
    setNoteText(business.notes || "");
  };

  // Handle save notes
  const handleSaveNotes = async () => {
    if (!editingNotes) return;

    try {
      // Find the business being edited
      const business = businesses.find((b) => b.id === editingNotes);
      if (!business) {
        throw new Error("Business not found");
      }

      await updateDoc(doc(db, "businesses", editingNotes), {
        notes: noteText,
      });

      // Update the business in local state instead of refreshing
      business.notes = noteText;

      toast.success("Notes saved");
      setEditingNotes(null);
      setNoteText("");
      // Do NOT call onRefresh() here - let React re-render with the updated object
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    }
  };

  // Handle filter input changes (for filter panel and search)
  const handleLocalFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    // If this is a search term, check if it's an area code
    if (name === "searchTerm") {
      // Check if the search term is a 3-digit number (potential area code)
      const isAreaCode = /^\d{3}$/.test(value);

      // If it's an area code, update both search term and area code filter
      if (isAreaCode) {
        const updatedLocalFilters = {
          ...localFilters,
          searchTerm: value,
          areaCode: value,
        };
        setLocalFilters(updatedLocalFilters);
        onFilterChange(updatedLocalFilters);
        return;
      }
    }

    const updatedLocalFilters = { ...localFilters, [name]: newValue };
    setLocalFilters(updatedLocalFilters);
    // Update parent immediately only for search term
    if (name === "searchTerm") {
      onFilterChange(updatedLocalFilters);
    }
  };

  // Apply filters (called by Apply button in filter panel)
  const applyFilters = () => {
    onFilterChange(localFilters);
    setShowFilters(false);
  };

  // Reset *all* filters (called by the new visible Reset button)
  const resetAllFilters = () => {
    const emptyFilters = {
      // Preserve other potential parent filters if any (like city)
      ...filters,
      // Reset all filter keys controlled by this component
      searchTerm: "",
      category: "",
      websiteStatus: "",
      pipelineStatus: "",
      hideNoPhone: false,
      hideNotQualified: false,
    };
    setLocalFilters(emptyFilters); // Reset local panel state too
    onFilterChange(emptyFilters); // Update parent
    setShowFilters(false); // Hide panel if open
  };

  // Reset only the filters *within* the panel
  const resetPanelFilters = () => {
    const resetPanelState = {
      ...localFilters, // Keep current search term etc.
      websiteStatus: filters.websiteStatus || "", // Reset to parent state or empty
      category: filters.category || "",
      pipelineStatus: filters.pipelineStatus || "",
      // Checkboxes are outside panel now
    };
    setLocalFilters(resetPanelState);
    // Don't call onFilterChange here, user needs to click Apply Panel Filters
  };

  // Handle shortcut filter clicks (Website Status, Category Tags, Pipeline Status)
  const handleShortcutFilter = (filterKey, filterValue) => {
    const newFilters = {
      ...filters, // Use current parent filters as base
      [filterKey]: filterValue,
    };
    // Don't need to update localFilters here unless the shortcut mirrors a panel control
    // setLocalFilters(newFilters); // Update local state too? Maybe not needed.
    onFilterChange(newFilters); // Update parent state immediately
  };

  // Handle Bulk Performance Check click
  const handleBulkCheckPerformanceClick = () => {
    if (selectedBusinesses.length === 0) {
      toast.error("No businesses selected.");
      return;
    }
    onCheckPerformance(selectedBusinesses);
  };

  // Handle assigning businesses to user
  const handleAssignToUser = async () => {
    if (!selectedUser || selectedBusinesses.length === 0) {
      toast.error("Please select a user and businesses to assign.");
      return;
    }

    setAssigningToUser(true);
    const toastId = toast.loading(
      `Assigning ${selectedBusinesses.length} businesses to user...`
    );

    try {
      const response = await fetch("/api/assignBusinesses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser,
          businessIds: selectedBusinesses,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Businesses assigned successfully", {
          id: toastId,
        });
        setShowUserAssignModal(false);
        setSelectedUser("");
        setSelectedBusinesses([]);
      } else {
        toast.error(data.error || "Failed to assign businesses", {
          id: toastId,
        });
      }
    } catch (error) {
      console.error("Error assigning businesses:", error);
      toast.error("Failed to assign businesses", { id: toastId });
    } finally {
      setAssigningToUser(false);
    }
  };

  // Helper to get pipeline status color
  const getStatusColor = (status) => {
    return PIPELINE_STATUSES_CONFIG[status]?.color || "gray";
  };

  // Helper to get pipeline status icon
  const getStatusIcon = (status) => {
    const Icon = PIPELINE_STATUSES_CONFIG[status]?.icon;
    return Icon ? <Icon className="h-3.5 w-3.5 mr-1.5" /> : null;
  };

  // Helper to format phone for tel: URI
  const formatPhoneNumberForTel = (phone) => {
    if (!phone) return "";
    // Remove any non-numeric characters except +
    return phone.replace(/[^\d+]/g, "");
  };

  // Handle copying name to clipboard
  const handleCopyName = async (name, e) => {
    e.stopPropagation(); // Prevent other clicks
    if (!navigator.clipboard) {
      toast.error("Clipboard access not available or not permitted.");
      return;
    }
    try {
      await navigator.clipboard.writeText(name);
      toast.success("Business name copied!");
    } catch (err) {
      console.error("Failed to copy business name: ", err);
      toast.error("Failed to copy business name.");
    }
  };

  // <<< Handler for copying phone number >>>
  const handleCopyPhone = async (phoneNumber, e) => {
    e.stopPropagation(); // Prevent other clicks like row navigation if added later
    if (!navigator.clipboard) {
      toast.error("Clipboard access not available or not permitted.");
      return;
    }
    try {
      await navigator.clipboard.writeText(phoneNumber);
      toast.success("Phone number copied!");
    } catch (err) {
      console.error("Failed to copy phone number: ", err);
      toast.error("Failed to copy phone number.");
    }
  };

  // Allow clicking outside the modal to close it
  const handleModalBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setEditingNotes(null);
      setNoteText("");
    }
  };

  // Handle setting a filter as default
  const handleSetDefaultFilter = (filterValue) => {
    // Don't set default if it's already the default
    if (filterValue === defaultWebsiteFilter) return;

    // Call parent function to update the default filter in database
    onSetDefaultWebsiteFilter(filterValue);
  };

  // Helper to get pipeline status background color
  const getStatusBgColor = (status) => {
    return PIPELINE_STATUSES_CONFIG[status]?.bgColor || "bg-white";
  };

  // Helper to generate Google business profile URL
  const generateGoogleBusinessUrl = (businessName, city, address) => {
    const searchQuery = encodeURIComponent(
      `${businessName} ${city || ""} ${address || ""}`.trim()
    );
    return `https://www.google.com/search?q=${searchQuery}`;
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Search, Toggles, Reset, More Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b">
        {/* Search Input */}
        <div className="relative w-full md:w-auto">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            name="searchTerm"
            className="pl-10 p-2 border rounded-md w-full md:w-64 text-sm"
            placeholder="Search name, category, address..."
            value={localFilters.searchTerm || ""}
            onChange={handleLocalFilterChange}
          />
        </div>

        {/* Quick Toggles & Actions */}
        <div className="flex gap-3 items-center flex-wrap">
          <label
            htmlFor="hideNoPhoneToggle"
            className="flex items-center cursor-pointer"
          >
            <input
              type="checkbox"
              id="hideNoPhoneToggle"
              name="hideNoPhone"
              checked={
                filters.hideNoPhone !== undefined ? filters.hideNoPhone : true
              }
              onChange={(e) =>
                handleShortcutFilter("hideNoPhone", e.target.checked)
              }
              className="mr-1 h-4 w-4"
            />
            <span className="text-sm">Hide No Phone</span>
          </label>
          <label
            htmlFor="hideNotQualifiedToggle"
            className="flex items-center cursor-pointer"
          >
            <input
              type="checkbox"
              id="hideNotQualifiedToggle"
              name="hideNotQualified"
              checked={filters.hideNotQualified || false}
              onChange={(e) =>
                handleShortcutFilter("hideNotQualified", e.target.checked)
              }
              className="mr-1 h-4 w-4"
            />
            <span className="text-sm">Hide Not Qualified</span>
          </label>

          <div className="border-l h-6 mx-1"></div>

          <button
            onClick={resetAllFilters} // <<< Reset All Button
            className="flex items-center gap-1 px-2 py-1 border rounded-md text-sm text-red-600 hover:bg-red-50"
            title="Reset All Filters"
          >
            <RefreshCw className="h-4 w-4" />
            Reset Filters
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-2 py-1 border rounded-md text-sm hover:bg-gray-100 ${
              showFilters ? "bg-gray-100" : ""
            }`}
          >
            <Filter className="h-4 w-4" />
            More Filters Panel
          </button>
        </div>
      </div>

      {/* Filters panel (conditionally rendered) */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-md border mt-2 mb-4">
          <h3 className="font-medium mb-3">Filter Panel</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Panel Filters: Website Status, Category, Pipeline Status */}
            <div>
              <label className="block text-sm mb-1">Website Status</label>
              <select
                name="websiteStatus"
                value={localFilters.websiteStatus || ""}
                onChange={handleLocalFilterChange}
                className="w-full p-2 border rounded-md text-sm"
              >
                <option value="">Any Status</option>
                <option value="none">No Website</option>
                <option value="facebook/instagram">Social Media Only</option>
                <option value="real">Real Website</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Category</label>
              <select
                name="category"
                value={localFilters.category || ""}
                onChange={handleLocalFilterChange}
                className="w-full p-2 border rounded-md text-sm"
              >
                <option value="">Any Category</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Pipeline Status</label>
              <select
                name="pipelineStatus"
                value={localFilters.pipelineStatus || ""}
                onChange={handleLocalFilterChange}
                className="w-full p-2 border rounded-md text-sm"
              >
                <option value="">Any Status</option>
                {PIPELINE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={resetPanelFilters}
              className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100"
            >
              {" "}
              Reset Panel{" "}
            </button>
            <button
              onClick={applyFilters}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {" "}
              Apply Panel Filters{" "}
            </button>
          </div>
        </div>
      )}

      {/* Shortcut Filters: Website Status, Categories, Pipeline Status */}
      <div className="space-y-3">
        {/* Website Status Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium mr-1">Website:</span>
          {Object.entries(WEBSITE_FILTERS).map(([value, config]) => {
            const Icon = config.icon;
            const isActive = filters.websiteStatus === value;
            const isDefault = defaultWebsiteFilter === value;

            return (
              <div key={value} className="flex items-center">
                <button
                  onClick={() => handleShortcutFilter("websiteStatus", value)}
                  title={config.label}
                  className={`p-1.5 inline-flex items-center justify-center rounded-md border text-xs ${
                    isActive
                      ? value === ""
                        ? "bg-gray-300 border-gray-400 font-semibold text-gray-700"
                        : value === "none"
                        ? "bg-green-200 border-green-400 font-semibold text-green-700"
                        : value === "facebook/instagram"
                        ? "bg-yellow-200 border-yellow-400 font-semibold text-yellow-700"
                        : "bg-red-200 border-red-400 font-semibold text-red-700"
                      : value === ""
                      ? "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                      : value === "none"
                      ? "bg-green-100 border-green-200 text-green-700 hover:bg-green-200"
                      : value === "facebook/instagram"
                      ? "bg-yellow-100 border-yellow-200 text-yellow-700 hover:bg-yellow-200"
                      : "bg-red-100 border-red-200 text-red-700 hover:bg-red-200"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="ml-1">{config.label}</span>
                  {isDefault && (
                    <Star className="h-3 w-3 ml-1 text-yellow-500 fill-yellow-500" />
                  )}
                </button>

                {/* Star button to set as default */}
                <button
                  onClick={() => handleSetDefaultFilter(value)}
                  className={`ml-1 p-1 rounded-md text-xs ${
                    isDefault
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-gray-400 hover:text-yellow-500"
                  }`}
                  title={isDefault ? "Default filter" : "Set as default filter"}
                >
                  <Star
                    className={`h-3 w-3 ${isDefault ? "fill-yellow-500" : ""}`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Category Shortcuts */}
        {uniqueCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium mr-1">Category:</span>
            <button
              onClick={() => handleShortcutFilter("category", "")}
              className={`px-2 py-0.5 text-xs rounded-full border ${
                !filters.category
                  ? "bg-gray-300 border-gray-500 font-semibold text-gray-800"
                  : "bg-gray-100 border-gray-300 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {uniqueCategories.map((category) => (
              <button
                key={category}
                onClick={() => handleShortcutFilter("category", category)}
                className={`px-2 py-0.5 text-xs rounded-full border ${
                  filters.category === category
                    ? "bg-blue-600 text-white border-blue-700 font-semibold"
                    : "bg-gray-100 border-gray-300 hover:bg-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* <<< Pipeline Status Shortcuts >>> */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium mr-1">Status:</span>
          {/* All Status Button */}
          <button
            onClick={() => handleShortcutFilter("pipelineStatus", "")}
            className={`flex items-center px-2 py-0.5 text-xs rounded-full border ${
              !filters.pipelineStatus
                ? "bg-gray-400 text-white border-gray-500 font-semibold"
                : "bg-gray-100 border-gray-300 hover:bg-gray-200"
            }`}
          >
            <List className="h-3.5 w-3.5 mr-1" /> All
          </button>
          {/* Individual Status Buttons */}
          {PIPELINE_STATUSES.map((status) => {
            const config = PIPELINE_STATUSES_CONFIG[status];
            const isActive = filters.pipelineStatus === status;

            return (
              <button
                key={status}
                onClick={() => handleShortcutFilter("pipelineStatus", status)}
                className={`flex items-center px-2 py-0.5 text-xs rounded-full border ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-700 font-semibold"
                    : `bg-${config.color || "gray"}-50 text-${
                        config.color || "gray"
                      }-700 border-${config.color || "gray"}-200 hover:bg-${
                        config.color || "gray"
                      }-100`
                }`}
                title={status}
              >
                {getStatusIcon(status)}
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk Actions Dropdown */}
      {selectedBusinesses.length > 0 && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t">
          <span className="text-sm font-medium text-gray-700">
            {selectedBusinesses.length} selected
          </span>
          <select
            className="p-2 border rounded-md text-sm"
            onChange={(e) => {
              if (e.target.value === "check_performance")
                handleBulkCheckPerformanceClick();
              else if (e.target.value === "assign_to_user")
                setShowUserAssignModal(true);
              else if (e.target.value) handleBulkUpdate(e.target.value);
              e.target.value = "";
            }}
            value=""
          >
            <option value="" disabled>
              Bulk Actions...
            </option>
            <optgroup label="Update Status">
              {PIPELINE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </optgroup>
            <optgroup label="User Management">
              <option value="assign_to_user">Assign to User</option>
            </optgroup>
            <optgroup label="Other Actions">
              <option value="check_performance">Check Performance</option>
            </optgroup>
          </select>
          <button
            onClick={() => setSelectedBusinesses([])}
            className="p-1 text-red-600 hover:text-red-800"
            title="Clear Selection"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border rounded-md mt-4">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left w-12">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={
                    paginatedBusinesses.length > 0 &&
                    selectedBusinesses.length === paginatedBusinesses.length
                  }
                />
              </th>
              <th className="px-2 py-3 text-left w-36">
                <div className="flex items-center space-x-1">
                  <Phone className="h-4 w-4 text-gray-400" title="Call Phone" />
                  <ClipboardCopy
                    className="h-4 w-4 text-gray-400"
                    title="Copy Phone"
                  />
                  <span className="text-xs text-gray-500 ml-1">Phone</span>
                </div>
              </th>
              <th className="px-2 py-3 text-left w-16 text-center">Image</th>
              <th
                className="px-2 py-3 text-left w-10"
                title="Website Status"
              ></th>
              <th
                className="px-4 py-3 text-left cursor-pointer w-32"
                onClick={() => requestSort("name")}
              >
                <div className="flex items-center">
                  <span>Business Name</span>
                  {getSortIndicator("name")}
                </div>
              </th>
              <th
                className="px-2 py-3 text-left cursor-pointer w-36"
                onClick={() => requestSort("pipeline_status")}
              >
                <div className="flex items-center">
                  <span>Pipeline Status</span>
                  {getSortIndicator("pipeline_status")}
                </div>
              </th>
              <th className="px-2 py-3 text-left w-20">Actions</th>
              <th className="px-2 py-3 text-left w-40">Website</th>
              <th
                className="px-2 py-3 text-left cursor-pointer w-28"
                onClick={() => requestSort("category")}
              >
                <div className="flex items-center">
                  <span>Category</span>
                  {getSortIndicator("category")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Table Rows - Check loading state from parent */}
            {loading ? (
              <tr>
                <td
                  colSpan="9"
                  className="px-4 py-10 text-center text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : paginatedBusinesses.length === 0 ? (
              <tr>
                <td
                  colSpan="9"
                  className="px-4 py-10 text-center text-gray-500"
                >
                  No businesses match the current filters
                </td>
              </tr>
            ) : (
              paginatedBusinesses.map((business) => {
                const formattedPhone = formatPhoneNumberForTel(business.phone);
                const rowBgColor = getStatusBgColor(
                  business.pipeline_status || "Not Contacted"
                );
                return (
                  <tr
                    key={business.id}
                    className={`hover:bg-gray-50 ${rowBgColor}`}
                  >
                    <td className="px-4 py-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedBusinesses.includes(business.id)}
                        onChange={() => handleSelectOne(business.id)}
                      />
                    </td>
                    <td className="px-2 py-4">
                      <div className="flex items-center space-x-1 whitespace-nowrap">
                        {business.phone ? (
                          <a
                            href={`tel:${formattedPhone}`}
                            title={`Call ${business.phone}`}
                            className="inline-flex items-center justify-center p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        ) : (
                          <span
                            className="inline-flex items-center justify-center p-1 text-gray-300 cursor-not-allowed"
                            title="No phone"
                          >
                            <PhoneOff className="h-4 w-4" />
                          </span>
                        )}
                        {business.phone ? (
                          <button
                            onClick={(e) => handleCopyPhone(business.phone, e)}
                            title="Copy phone"
                            className="inline-flex items-center justify-center p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full"
                          >
                            <ClipboardCopy className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center justify-center p-1 text-gray-300 cursor-not-allowed">
                            <ClipboardCopy className="h-4 w-4" />
                          </span>
                        )}
                        {business.phone && (
                          <span
                            className="ml-1 text-gray-700 text-xs truncate max-w-[100px]"
                            title={business.phone}
                          >
                            {business.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-4 w-16 text-center align-middle">
                      {business.imageUrl ? (
                        <img
                          src={business.imageUrl}
                          alt={`${business.name || "Business"} image`}
                          className="w-12 h-12 object-cover rounded-md inline-block"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display =
                              "none"; /* Hide broken image */
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-md text-gray-400">
                          <ImageOff className="h-6 w-6" />
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-4 w-10">
                      {business.website_status === "real" && (
                        <span
                          className="p-1.5 inline-flex items-center justify-center rounded-md bg-red-100 text-red-700"
                          title="Real Website"
                        >
                          <Globe className="h-4 w-4" />
                        </span>
                      )}
                      {business.website_status === "facebook/instagram" && (
                        <span
                          className="p-1.5 inline-flex items-center justify-center rounded-md bg-yellow-100 text-yellow-700"
                          title="Social Media Only"
                        >
                          {business.website?.includes("facebook") ? (
                            <Facebook className="h-4 w-4" />
                          ) : business.website?.includes("instagram") ? (
                            <Instagram className="h-4 w-4" />
                          ) : (
                            <Share2 className="h-4 w-4" />
                          )}
                        </span>
                      )}
                      {business.website_status === "none" && (
                        <span
                          className="p-1.5 inline-flex items-center justify-center rounded-md bg-green-100 text-green-700"
                          title="No Website"
                        >
                          <XCircle className="h-4 w-4" />
                        </span>
                      )}
                      {!business.website_status && (
                        <span
                          className="p-1.5 inline-flex items-center justify-center rounded-md bg-gray-100 text-gray-400"
                          title="Unknown"
                        >
                          <Layers className="h-4 w-4" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-medium">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleCopyName(business.name, e)}
                          title="Copy business name"
                          className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full mr-1"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={generateGoogleBusinessUrl(
                            business.name,
                            business.city,
                            business.address
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Search ${business.name} on Google`}
                          className="truncate max-w-[100px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {business.name}
                        </a>
                      </div>
                    </td>
                    <td className="px-2 py-4">
                      <select
                        value={business.pipeline_status || "Not Contacted"}
                        onChange={(e) =>
                          handleStatusChange(business.id, e.target.value)
                        }
                        className={`p-1 text-xs border rounded bg-white w-full`}
                      >
                        {PIPELINE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-4">
                      <div className="flex items-center">
                        <button
                          onClick={(e) => handleEditNotes(business)}
                          className="flex items-center p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"
                          title="Edit Notes"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="ml-1 text-xs">
                            {business.notes?.length || 0}
                          </span>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {(business.website_status === "real" ||
                        business.website_status === "facebook/instagram") &&
                      business.website ? (
                        <a
                          href={business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:underline"
                          title={business.website}
                        >
                          <span className="mr-1 truncate max-w-[150px]">
                            {business.website.length > 25
                              ? `${business.website.substring(0, 25)}...`
                              : business.website}
                          </span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-gray-500 text-xs">
                          {WEBSITE_STATUS_DISPLAY[business.website_status] ||
                            "No Website"}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-600">
                      <div
                        className="truncate max-w-[100px]"
                        title={business.category}
                      >
                        {business.category}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Notes editing modal */}
      {editingNotes && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleModalBackdropClick}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-4">
              Edit Notes for{" "}
              {businesses.find((b) => b.id === editingNotes)?.name || ""}
            </h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full p-2 border rounded-md h-32 mb-4"
              placeholder="Add notes about this business..."
            ></textarea>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setEditingNotes(null)}
                className="px-4 py-2 border rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Assignment Modal */}
      {showUserAssignModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUserAssignModal(false);
              setSelectedUser("");
            }
          }}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-4">
              Assign Businesses to User
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              You are about to assign {selectedBusinesses.length} selected
              businesses to a user.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select User
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full p-2 border rounded-md"
                disabled={assigningToUser}
              >
                <option value="">Choose a user...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.id} {user.email && `(${user.email})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowUserAssignModal(false);
                  setSelectedUser("");
                }}
                className="px-4 py-2 border rounded-md hover:bg-gray-100"
                disabled={assigningToUser}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignToUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={!selectedUser || assigningToUser}
              >
                {assigningToUser ? "Assigning..." : "Assign Businesses"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            {" "}
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, sortedBusinesses.length)} of{" "}
            {sortedBusinesses.length} businesses{" "}
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md text-sm ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              First
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md text-sm ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Prev
            </button>
            {/* Dynamically generate page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => {
                // Basic logic to show limited pages, improve if needed
                if (
                  totalPages <= 7 ||
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {" "}
                      {pageNum}{" "}
                    </button>
                  );
                } else if (
                  pageNum === currentPage - 3 ||
                  pageNum === currentPage + 3
                ) {
                  return (
                    <span key={pageNum} className="px-3 py-1 text-gray-400">
                      ...
                    </span>
                  );
                }
                return null;
              }
            )}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md text-sm ${
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Next
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md text-sm ${
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
