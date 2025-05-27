import Head from "next/head"
import DashboardLayout from "../components/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  return (
    <>
      <Head>
        <title>Settings | Google Maps Scraper</title>
        <meta name="description" content="Configure your Google Maps scraper" />
      </Head>

      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Configure your scraper and application settings</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Scraper Settings</CardTitle>
              <CardDescription>Configure how the scraper behaves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="min-delay">Minimum Delay (seconds)</Label>
                <Input id="min-delay" type="number" defaultValue="3" min="1" max="30" />
                <p className="text-sm text-muted-foreground">Minimum delay between requests in seconds</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-delay">Maximum Delay (seconds)</Label>
                <Input id="max-delay" type="number" defaultValue="12" min="1" max="60" />
                <p className="text-sm text-muted-foreground">Maximum delay between requests in seconds</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="headless">Browser Mode</Label>
                <select id="headless" className="w-full p-2 border rounded-md">
                  <option value="false">Visible (with browser UI)</option>
                  <option value="true">Headless (invisible)</option>
                </select>
                <p className="text-sm text-muted-foreground">Whether to show the browser window during scraping</p>
              </div>

              <Button>Save Settings</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Settings</CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue="admin@example.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" defaultValue="********" />
              </div>

              <Button>Update Profile</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </>
  )
}
