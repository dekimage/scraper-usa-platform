import { Clock, CheckCircle, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function JobHistoryLog({ jobs }) {
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown"

    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Scraper Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No job history available</div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
                <div className="flex items-center">
                  {job.status === "completed" ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  ) : job.status === "failed" ? (
                    <XCircle className="h-5 w-5 text-red-500 mr-3" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-500 mr-3" />
                  )}
                  <div>
                    <div className="font-medium">
                      {job.businessType} in {job.city}
                    </div>
                    <div className="text-sm text-gray-500">
                      {job.status === "completed"
                        ? `Scraped ${job.resultsCount} businesses`
                        : job.status === "failed"
                          ? `Failed: ${job.error || "Unknown error"}`
                          : "In progress..."}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">{formatDate(job.timestamp)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
