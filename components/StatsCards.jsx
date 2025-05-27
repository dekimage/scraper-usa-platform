import { BarChart, Globe, Facebook, Ban, Users, PhoneCall } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-md">
              <BarChart className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Businesses</p>
              <p className="text-2xl font-semibold">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-md">
              <Globe className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Real Websites</p>
              <p className="text-2xl font-semibold">{stats.realWebsite}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-md">
              <Facebook className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Social Media Only</p>
              <p className="text-2xl font-semibold">{stats.socialOnly}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-md">
              <Ban className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">No Website</p>
              <p className="text-2xl font-semibold">{stats.noWebsite}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-md">
              <Users className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Not Contacted</p>
              <p className="text-2xl font-semibold">{stats.notContacted}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <div className="p-2 bg-teal-100 rounded-md">
              <PhoneCall className="h-6 w-6 text-teal-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Contacted</p>
              <p className="text-2xl font-semibold">{stats.contacted}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
