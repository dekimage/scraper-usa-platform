"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ExternalLink,
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
  Users,
  ArrowRight,
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/clientApp";
import { toast } from "react-hot-toast";
import { recordUserInteraction } from "../firebase/userAnalyticsTracker";

// Pipeline status options & styling
const PIPELINE_STATUSES_CONFIG = {
  "Not Contacted": { color: "gray", icon: UserX },
  Contacted: { color: "blue", icon: Send },
  "Waiting Response": { color: "orange", icon: Clock },
  "No Answer": { color: "yellow", icon: PhoneOff },
  "Action Required": { color: "purple", icon: RefreshCw },
  "Closed / Won": { color: "green", icon: CheckCircle },
  "Rejected / Not Interested": { color: "red", icon: ThumbsDown },
  "Not Qualified": { color: "purple", icon: Slash },
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

export default function UserBusinessTable({
  businesses,
  loading,
  user,
  onUpdateUserPreferences,
}) {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    searchTerm: "",
    category: "",
    websiteStatus: "",
    pipelineStatus: "",
    hideNoPhone: true,
    hideNotQualified: false,
    showOnlyPassed: false,
    showOnlyNotPassed: false,
  });
  const [editingNotes, setEditingNotes] = useState(null);
  const [noteText, setNoteText] = useState("");

  // Bulk selection state
  const [selectedBusinesses, setSelectedBusinesses] = useState([]);
  const [showWebCloserModal, setShowWebCloserModal] = useState(false);
  const [webClosers, setWebClosers] = useState([]);
  const [selectedWebCloser, setSelectedWebCloser] = useState("");
  const [passingToWebCloser, setPassingToWebCloser] = useState(false);

  // Calculate unique categories dynamically
  const uniqueCategories = useMemo(() => {
    if (!businesses || businesses.length === 0) {
      return [];
    }
    const categories = new Set(
      businesses.map((b) => b.category).filter(Boolean)
    );
    return Array.from(categories).sort();
  }, [businesses]);

  const itemsPerPage = 50;

  // Reset page when businesses change
  useEffect(() => {
    setCurrentPage(1);
  }, [businesses]);

  // Apply user preferences when user data is available
  useEffect(() => {
    if (user?.preferences) {
      const defaultFilters = {
        searchTerm: "",
        category: "",
        websiteStatus: user.preferences.defaultWebsiteStatus || "",
        pipelineStatus: user.preferences.defaultPipelineStatus || "",
        hideNoPhone:
          user.preferences.defaultHideNoPhone !== undefined
            ? user.preferences.defaultHideNoPhone
            : true,
        hideNotQualified: user.preferences.defaultHideNotQualified || false,
        showOnlyPassed: false,
        showOnlyNotPassed: false,
      };
      setLocalFilters(defaultFilters);
    }
  }, [user]);

  // Fetch web closers when component mounts
  useEffect(() => {
    fetchWebClosers();
  }, []);

  // Function to fetch web closers
  const fetchWebClosers = async () => {
    try {
      const response = await fetch("/api/getWebClosers");
      const data = await response.json();
      if (response.ok) {
        setWebClosers(data.webClosers || []);
      } else {
        console.error("Failed to fetch web closers:", data.error);
      }
    } catch (error) {
      console.error("Error fetching web closers:", error);
    }
  };

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

  // Filter businesses locally
  const filteredBusinesses = useMemo(() => {
    return sortedBusinesses.filter((business) => {
      const searchTermLower = localFilters.searchTerm?.toLowerCase() || "";
      const isAreaCodeSearch = /^\d{3}$/.test(localFilters.searchTerm);

      if (isAreaCodeSearch) {
        const areaCode = extractAreaCode(business.phone);
        if (areaCode !== localFilters.searchTerm) {
          return false;
        }
      } else {
        const matchesSearch =
          !localFilters.searchTerm ||
          business.name?.toLowerCase().includes(searchTermLower) ||
          business.category?.toLowerCase().includes(searchTermLower) ||
          business.address?.toLowerCase().includes(searchTermLower);

        if (!matchesSearch) return false;
      }

      const matchesCategory =
        !localFilters.category || business.category === localFilters.category;

      const matchesWebsiteStatus =
        !localFilters.websiteStatus ||
        business.website_status === localFilters.websiteStatus;

      const matchesPipelineStatus =
        !localFilters.pipelineStatus ||
        business.pipeline_status === localFilters.pipelineStatus;

      const matchesHideNoPhone = !localFilters.hideNoPhone || !!business.phone;

      const matchesHideNotQualified =
        !localFilters.hideNotQualified ||
        business.pipeline_status !== "Not Qualified";

      // Filter for passed/not passed businesses
      const matchesPassedFilter =
        (!localFilters.showOnlyPassed && !localFilters.showOnlyNotPassed) ||
        (localFilters.showOnlyPassed && business.passedTo) ||
        (localFilters.showOnlyNotPassed && !business.passedTo);

      return (
        matchesCategory &&
        matchesWebsiteStatus &&
        matchesPipelineStatus &&
        matchesHideNoPhone &&
        matchesHideNotQualified &&
        matchesPassedFilter
      );
    });
  }, [sortedBusinesses, localFilters]);

  // Paginate businesses
  const paginatedBusinesses = useMemo(() => {
    return filteredBusinesses.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredBusinesses, currentPage, itemsPerPage]);

  // Total pages
  const totalPages = Math.ceil(filteredBusinesses.length / itemsPerPage);

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
  const handleSelectOne = (businessId) => {
    if (selectedBusinesses.includes(businessId)) {
      setSelectedBusinesses(
        selectedBusinesses.filter((id) => id !== businessId)
      );
    } else {
      setSelectedBusinesses([...selectedBusinesses, businessId]);
    }
  };

  // Handle pass to web closer
  const handlePassToWebCloser = async () => {
    if (!selectedWebCloser || selectedBusinesses.length === 0) {
      toast.error("Please select a web closer and businesses to pass.");
      return;
    }

    setPassingToWebCloser(true);
    const toastId = toast.loading(
      `Passing ${selectedBusinesses.length} businesses to web closer...`
    );

    try {
      const response = await fetch("/api/passToWebCloser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromUserId: user.id,
          toWebCloserId: selectedWebCloser,
          businessIds: selectedBusinesses,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Businesses passed successfully", {
          id: toastId,
        });

        // Update local state to reflect the passed businesses
        selectedBusinesses.forEach((businessId) => {
          const business = businesses.find((b) => b.id === businessId);
          if (business) {
            business.passedTo = selectedWebCloser;
            business.passedBy = user.id;
            business.passedAt = new Date();
          }
        });

        setShowWebCloserModal(false);
        setSelectedWebCloser("");
        setSelectedBusinesses([]);
      } else {
        toast.error(data.error || "Failed to pass businesses", {
          id: toastId,
        });
      }
    } catch (error) {
      console.error("Error passing businesses:", error);
      toast.error("Failed to pass businesses", { id: toastId });
    } finally {
      setPassingToWebCloser(false);
    }
  };

  // Handle pipeline status change
  const handleStatusChange = async (businessId, status) => {
    const toastId = toast.loading(`Updating status to "${status}"...`);
    try {
      const business = businesses.find((b) => b.id === businessId);
      if (!business) {
        throw new Error("Business not found");
      }

      const previousStatus = business.pipeline_status || "Not Contacted";

      await updateDoc(doc(db, "businesses", businessId), {
        pipeline_status: status,
      });

      // Track user analytics
      await recordUserInteraction({
        userId: user.id,
        businessId,
        businessName: business.name,
        category: business.category,
        city: business.city,
        actionType: "status_change",
        previousStatus,
        newStatus: status,
      });

      business.pipeline_status = status;
      toast.success(`Updated status to "${status}"`, { id: toastId });
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status", { id: toastId });
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
      const business = businesses.find((b) => b.id === editingNotes);
      if (!business) {
        throw new Error("Business not found");
      }

      await updateDoc(doc(db, "businesses", editingNotes), {
        notes: noteText,
      });

      // Track user analytics for notes update
      await recordUserInteraction({
        userId: user.id,
        businessId: editingNotes,
        businessName: business.name,
        category: business.category,
        city: business.city,
        actionType: "notes_update",
        notes: noteText,
      });

      business.notes = noteText;
      toast.success("Notes saved");
      setEditingNotes(null);
      setNoteText("");
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    }
  };

  // Handle filter input changes
  const handleLocalFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    const updatedLocalFilters = { ...localFilters, [name]: newValue };
    setLocalFilters(updatedLocalFilters);
  };

  // Reset filters
  const resetAllFilters = () => {
    const emptyFilters = {
      searchTerm: "",
      category: "",
      websiteStatus: "",
      pipelineStatus: "",
      hideNoPhone: false,
      hideNotQualified: false,
      showOnlyPassed: false,
      showOnlyNotPassed: false,
    };
    setLocalFilters(emptyFilters);
    setShowFilters(false);
  };

  // Handle shortcut filter clicks
  const handleShortcutFilter = (filterKey, filterValue) => {
    const newFilters = {
      ...localFilters,
      [filterKey]: filterValue,
    };
    setLocalFilters(newFilters);
  };

  // Handle setting a filter as favorite
  const handleSetFavoriteFilter = async (filterKey, filterValue) => {
    try {
      const currentPreferences = user.preferences || {};
      const updatedPreferences = {
        ...currentPreferences,
        [`default${filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}`]:
          filterValue,
      };

      await onUpdateUserPreferences(updatedPreferences);
      toast.success("Filter saved as favorite");
    } catch (error) {
      console.error("Error saving favorite filter:", error);
      toast.error("Failed to save favorite filter");
    }
  };

  // Helper functions
  const getStatusIcon = (status) => {
    const Icon = PIPELINE_STATUSES_CONFIG[status]?.icon;
    return Icon ? <Icon className="h-3.5 w-3.5 mr-1.5" /> : null;
  };

  const formatPhoneNumberForTel = (phone) => {
    if (!phone) return "";
    return phone.replace(/[^\d+]/g, "");
  };

  const handleCopyName = async (name, e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(name);
      toast.success("Business name copied!");
    } catch (err) {
      toast.error("Failed to copy business name.");
    }
  };

  const handleCopyPhone = async (phoneNumber, e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(phoneNumber);
      toast.success("Phone number copied!");
    } catch (err) {
      toast.error("Failed to copy phone number.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Search, Toggles, Reset, More Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b">
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

        <div className="flex gap-3 items-center flex-wrap">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="hideNoPhone"
              checked={localFilters.hideNoPhone || false}
              onChange={handleLocalFilterChange}
              className="mr-1 h-4 w-4"
            />
            <span className="text-sm">Hide No Phone</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="hideNotQualified"
              checked={localFilters.hideNotQualified || false}
              onChange={handleLocalFilterChange}
              className="mr-1 h-4 w-4"
            />
            <span className="text-sm">Hide Not Qualified</span>
          </label>

          <div className="border-l h-6 mx-1"></div>

          <button
            onClick={resetAllFilters}
            className="flex items-center gap-1 px-2 py-1 border rounded-md text-sm text-red-600 hover:bg-red-50"
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
            More Filters
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedBusinesses.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-800">
              {selectedBusinesses.length} business
              {selectedBusinesses.length !== 1 ? "es" : ""} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedBusinesses([])}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Selection
            </button>
            {webClosers.length > 0 && (
              <button
                onClick={() => setShowWebCloserModal(true)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                <Users className="h-4 w-4" />
                Pass to Web Closer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-md border mt-2 mb-4">
          <h3 className="font-medium mb-3">Filter Panel</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
            <div>
              <label className="block text-sm mb-1">Passed Status</label>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="showOnlyPassed"
                    checked={localFilters.showOnlyPassed || false}
                    onChange={handleLocalFilterChange}
                    className="mr-2 h-4 w-4"
                  />
                  <span className="text-sm">Show Only Passed</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="showOnlyNotPassed"
                    checked={localFilters.showOnlyNotPassed || false}
                    onChange={handleLocalFilterChange}
                    className="mr-2 h-4 w-4"
                  />
                  <span className="text-sm">Show Only Not Passed</span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setShowFilters(false)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Shortcut Filters */}
      <div className="space-y-3">
        {/* Website Status Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium mr-1">Website:</span>
          {Object.entries(WEBSITE_FILTERS).map(([value, config]) => {
            const Icon = config.icon;
            const isActive = localFilters.websiteStatus === value;
            const isFavorite = user.preferences?.defaultWebsiteStatus === value;

            return (
              <div key={value} className="flex items-center">
                <button
                  onClick={() => handleShortcutFilter("websiteStatus", value)}
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
                  {isFavorite && (
                    <Star className="h-3 w-3 ml-1 text-yellow-500 fill-yellow-500" />
                  )}
                </button>

                <button
                  onClick={() =>
                    handleSetFavoriteFilter("websiteStatus", value)
                  }
                  className={`ml-1 p-1 rounded-md text-xs ${
                    isFavorite
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-gray-400 hover:text-yellow-500"
                  }`}
                  title={
                    isFavorite ? "Favorite filter" : "Set as favorite filter"
                  }
                >
                  <Star
                    className={`h-3 w-3 ${isFavorite ? "fill-yellow-500" : ""}`}
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
                !localFilters.category
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
                  localFilters.category === category
                    ? "bg-blue-600 text-white border-blue-700 font-semibold"
                    : "bg-gray-100 border-gray-300 hover:bg-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* Pipeline Status Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium mr-1">Status:</span>
          <button
            onClick={() => handleShortcutFilter("pipelineStatus", "")}
            className={`flex items-center px-2 py-0.5 text-xs rounded-full border ${
              !localFilters.pipelineStatus
                ? "bg-gray-400 text-white border-gray-500 font-semibold"
                : "bg-gray-100 border-gray-300 hover:bg-gray-200"
            }`}
          >
            <List className="h-3.5 w-3.5 mr-1" /> All
          </button>
          {PIPELINE_STATUSES.map((status) => {
            const config = PIPELINE_STATUSES_CONFIG[status];
            const isActive = localFilters.pipelineStatus === status;

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
              >
                {getStatusIcon(status)}
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600 mb-3">
        Showing {filteredBusinesses.length} of {businesses.length} businesses
        {localFilters.searchTerm ||
        localFilters.category ||
        localFilters.websiteStatus ||
        localFilters.pipelineStatus ||
        localFilters.hideNoPhone ||
        localFilters.hideNotQualified
          ? " (filtered)"
          : ""}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-md mt-4">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={
                    selectedBusinesses.length === paginatedBusinesses.length &&
                    paginatedBusinesses.length > 0
                  }
                  onChange={handleSelectAll}
                  className="h-4 w-4"
                />
              </th>
              <th className="px-2 py-3 text-left w-36">
                <div className="flex items-center space-x-1">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <ClipboardCopy className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-500 ml-1">Phone</span>
                </div>
              </th>
              <th className="px-2 py-3 text-left w-16 text-center">Image</th>
              <th className="px-2 py-3 text-left w-10"></th>
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
              <th className="px-2 py-3 text-left w-24">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td
                  colSpan="10"
                  className="px-4 py-10 text-center text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : paginatedBusinesses.length === 0 ? (
              <tr>
                <td
                  colSpan="10"
                  className="px-4 py-10 text-center text-gray-500"
                >
                  No businesses match the current filters
                </td>
              </tr>
            ) : (
              paginatedBusinesses.map((business) => {
                const formattedPhone = formatPhoneNumberForTel(business.phone);
                const isSelected = selectedBusinesses.includes(business.id);
                const isPassed = !!business.passedTo;

                return (
                  <tr
                    key={business.id}
                    className={`hover:bg-gray-50 ${
                      isPassed ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-2 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(business.id)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-2 py-4">
                      <div className="flex items-center space-x-1 whitespace-nowrap">
                        {business.phone ? (
                          <a
                            href={`tel:${formattedPhone}`}
                            className="inline-flex items-center justify-center p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center justify-center p-1 text-gray-300 cursor-not-allowed">
                            <PhoneOff className="h-4 w-4" />
                          </span>
                        )}
                        {business.phone ? (
                          <button
                            onClick={(e) => handleCopyPhone(business.phone, e)}
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
                          <span className="ml-1 text-gray-700 text-xs truncate max-w-[100px]">
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
                            e.target.style.display = "none";
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
                        <span className="p-1.5 inline-flex items-center justify-center rounded-md bg-red-100 text-red-700">
                          <Globe className="h-4 w-4" />
                        </span>
                      )}
                      {business.website_status === "facebook/instagram" && (
                        <span className="p-1.5 inline-flex items-center justify-center rounded-md bg-yellow-100 text-yellow-700">
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
                        <span className="p-1.5 inline-flex items-center justify-center rounded-md bg-green-100 text-green-700">
                          <XCircle className="h-4 w-4" />
                        </span>
                      )}
                      {!business.website_status && (
                        <span className="p-1.5 inline-flex items-center justify-center rounded-md bg-gray-100 text-gray-400">
                          <Layers className="h-4 w-4" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-medium">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleCopyName(business.name, e)}
                          className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full mr-1"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <span className="truncate max-w-[100px]">
                          {business.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-4">
                      <select
                        value={business.pipeline_status || "Not Contacted"}
                        onChange={(e) =>
                          handleStatusChange(business.id, e.target.value)
                        }
                        className="p-1 text-xs border rounded bg-white w-full"
                        disabled={isPassed}
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
                          onClick={() => handleEditNotes(business)}
                          className="flex items-center p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"
                          disabled={isPassed}
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
                      <div className="truncate max-w-[100px]">
                        {business.category}
                      </div>
                    </td>
                    <td className="px-2 py-4">
                      {isPassed ? (
                        <div className="flex items-center text-xs">
                          <ArrowRight className="h-3 w-3 text-blue-600 mr-1" />
                          <span className="text-blue-600 font-medium">
                            Passed
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Active</span>
                      )}
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingNotes(null);
              setNoteText("");
            }
          }}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredBusinesses.length)} of{" "}
            {filteredBusinesses.length} businesses
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => {
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
                      {pageNum}
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

      {/* Web Closer Modal */}
      {showWebCloserModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowWebCloserModal(false);
              setSelectedWebCloser("");
            }
          }}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-4">Pass to Web Closer</h3>
            <p className="text-sm text-gray-600 mb-4">
              You are about to pass {selectedBusinesses.length} selected
              businesses to a web closer.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Web Closer
              </label>
              <select
                value={selectedWebCloser}
                onChange={(e) => setSelectedWebCloser(e.target.value)}
                className="w-full p-2 border rounded-md"
                disabled={passingToWebCloser}
              >
                <option value="">Choose a web closer...</option>
                {webClosers.map((closer) => (
                  <option key={closer.id} value={closer.id}>
                    {closer.name || closer.id}{" "}
                    {closer.email && `(${closer.email})`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowWebCloserModal(false);
                  setSelectedWebCloser("");
                }}
                className="px-4 py-2 border rounded-md hover:bg-gray-100"
                disabled={passingToWebCloser}
              >
                Cancel
              </button>
              <button
                onClick={handlePassToWebCloser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={!selectedWebCloser || passingToWebCloser}
              >
                {passingToWebCloser ? "Passing..." : "Pass Businesses"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
