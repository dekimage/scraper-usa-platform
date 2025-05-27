"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, ExternalLink, MoreHorizontal, Edit, Star, Filter, Search, Loader2 } from "lucide-react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "../firebase/clientApp"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

// Pipeline status options
const PIPELINE_STATUSES = [
  "Not Contacted",
  "Contacted",
  "Waiting Response",
  "Closed / Won",
  "Rejected / Not Interested",
]

// Website status display mapping
const WEBSITE_STATUS_DISPLAY = {
  none: "No Website",
  "facebook/instagram": "Social Media Only",
  real: "Real Website",
}

export default function BusinessTable({ businesses, loading, onFilterChange, filters, onRefresh }) {
  const [selectedBusinesses, setSelectedBusinesses] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" })
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [localFilters, setLocalFilters] = useState(filters)
  const [editingNotes, setEditingNotes] = useState(null)
  const [noteText, setNoteText] = useState("")

  const itemsPerPage = 10

  // Reset page when businesses change
  useEffect(() => {
    setCurrentPage(1)
  }, [businesses])

  // Handle sort
  const handleSort = (key) => {
    let direction = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  // Sort businesses
  const sortedBusinesses = [...businesses].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? -1 : 1
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? 1 : -1
    }
    return 0
  })

  // Filter businesses by search term
  const filteredBusinesses = sortedBusinesses.filter((business) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      (business.name && business.name.toLowerCase().includes(searchLower)) ||
      (business.address && business.address.toLowerCase().includes(searchLower)) ||
      (business.phone && business.phone.toLowerCase().includes(searchLower))
    )
  })

  // Paginate businesses
  const paginatedBusinesses = filteredBusinesses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Total pages
  const totalPages = Math.ceil(filteredBusinesses.length / itemsPerPage)

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedBusinesses(paginatedBusinesses.map((business) => business.id))
    } else {
      setSelectedBusinesses([])
    }
  }

  // Handle select one
  const handleSelectOne = (id) => {
    if (selectedBusinesses.includes(id)) {
      setSelectedBusinesses(selectedBusinesses.filter((businessId) => businessId !== id))
    } else {
      setSelectedBusinesses([...selectedBusinesses, id])
    }
  }

  // Handle bulk update
  const handleBulkUpdate = async (status) => {
    if (selectedBusinesses.length === 0) {
      toast.error("No businesses selected")
      return
    }

    try {
      // Update each selected business
      for (const businessId of selectedBusinesses) {
        await updateDoc(doc(db, "businesses", businessId), {
          pipeline_status: status,
        })
      }

      toast.success(`Updated ${selectedBusinesses.length} businesses to "${status}"`)
      setSelectedBusinesses([])
      onRefresh()
    } catch (error) {
      console.error("Error updating businesses:", error)
      toast.error("Failed to update businesses")
    }
  }

  // Handle pipeline status change
  const handleStatusChange = async (businessId, status) => {
    try {
      await updateDoc(doc(db, "businesses", businessId), {
        pipeline_status: status,
      })

      toast.success(`Updated status to "${status}"`)
      onRefresh()
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Failed to update status")
    }
  }

  // Handle notes edit
  const handleEditNotes = (business) => {
    setEditingNotes(business.id)
    setNoteText(business.notes || "")
  }

  // Handle save notes
  const handleSaveNotes = async () => {
    if (!editingNotes) return

    try {
      await updateDoc(doc(db, "businesses", editingNotes), {
        notes: noteText,
      })

      toast.success("Notes saved")
      setEditingNotes(null)
      setNoteText("")
      onRefresh()
    } catch (error) {
      console.error("Error saving notes:", error)
      toast.error("Failed to save notes")
    }
  }

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setLocalFilters({
      ...localFilters,
      [name]: value,
    })
  }

  // Apply filters
  const applyFilters = () => {
    onFilterChange(localFilters)
    setShowFilters(false)
  }

  // Reset filters
  const resetFilters = () => {
    const emptyFilters = {
      websiteStatus: "",
      city: "",
      businessType: "",
      minRating: 0,
      pipelineStatus: "",
    }
    setLocalFilters(emptyFilters)
    onFilterChange(emptyFilters)
    setShowFilters(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search and filters */}
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                className="pl-10"
                placeholder="Search businesses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>

              {selectedBusinesses.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{selectedBusinesses.length} selected</span>
                  <Select onValueChange={handleBulkUpdate}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Bulk Update" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="bg-gray-50 p-4 rounded-md border">
              <h3 className="font-medium mb-3">Filter Businesses</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Website Status</Label>
                  <Select
                    value={localFilters.websiteStatus}
                    onValueChange={(value) => setLocalFilters({ ...localFilters, websiteStatus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="none">No Website</SelectItem>
                      <SelectItem value="facebook/instagram">Social Media Only</SelectItem>
                      <SelectItem value="real">Real Website</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>City</Label>
                  <Input
                    type="text"
                    name="city"
                    value={localFilters.city}
                    onChange={handleFilterChange}
                    placeholder="Filter by city"
                  />
                </div>

                <div>
                  <Label>Business Type</Label>
                  <Input
                    type="text"
                    name="businessType"
                    value={localFilters.businessType}
                    onChange={handleFilterChange}
                    placeholder="Filter by type"
                  />
                </div>

                <div>
                  <Label>Min Rating</Label>
                  <Input
                    type="number"
                    name="minRating"
                    value={localFilters.minRating}
                    onChange={handleFilterChange}
                    min="0"
                    max="5"
                    step="0.1"
                  />
                </div>

                <div>
                  <Label>Pipeline Status</Label>
                  <Select
                    value={localFilters.pipelineStatus}
                    onValueChange={(value) => setLocalFilters({ ...localFilters, pipelineStatus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {PIPELINE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetFilters}>
                  Reset
                </Button>
                <Button onClick={applyFilters}>Apply Filters</Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        paginatedBusinesses.length > 0 && selectedBusinesses.length === paginatedBusinesses.length
                      }
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                    <div className="flex items-center">
                      <span>Business Name</span>
                      {sortConfig.key === "name" && (
                        <span className="ml-1">
                          {sortConfig.direction === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("rating")}>
                    <div className="flex items-center">
                      <span>Rating</span>
                      {sortConfig.key === "rating" && (
                        <span className="ml-1">
                          {sortConfig.direction === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Pipeline Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan="8" className="text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <span className="mt-2 block">Loading...</span>
                    </TableCell>
                  </TableRow>
                ) : paginatedBusinesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="8" className="text-center">
                      No businesses found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedBusinesses.map((business) => (
                    <TableRow key={business.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedBusinesses.includes(business.id)}
                          onChange={() => handleSelectOne(business.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{business.name}</TableCell>
                      <TableCell className="text-sm">{business.category}</TableCell>
                      <TableCell className="text-sm">
                        <div>{business.address}</div>
                        <div>{business.phone}</div>
                      </TableCell>
                      <TableCell>
                        {business.rating ? (
                          <div className="flex items-center">
                            <span className="mr-1">{business.rating}</span>
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                            <span className="ml-1 text-sm text-gray-500">({business.reviews})</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        {business.website ? (
                          <a
                            href={business.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-600 hover:underline"
                          >
                            <span className="mr-1">{WEBSITE_STATUS_DISPLAY[business.website_status]}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-gray-500">No website</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={business.pipeline_status}
                          onValueChange={(value) => handleStatusChange(business.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder={business.pipeline_status} />
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditNotes(business)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Notes editing modal */}
          {editingNotes && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h3 className="text-lg font-medium mb-4">Edit Notes</h3>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full p-2 border rounded-md h-32 mb-4"
                  placeholder="Add notes about this business..."
                ></textarea>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setEditingNotes(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveNotes}>Save Notes</Button>
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredBusinesses.length)} of {filteredBusinesses.length} results
              </div>
              <div className="flex space-x-1">
                <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Prev
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
