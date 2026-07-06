import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BarChart3, FileText, Users, Target, Clock, TrendingUp } from "lucide-react";

export default function MyWorkspace() {
  const { user } = useAuth();
  const { data: dashboard } = trpc.dashboard.summary.useQuery();
  const { data: recentActivity } = trpc.audit.list.useQuery();

  if (user?.roleId !== 1 && user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Only ADFA and Admins can access My Workspace.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Workspace</h1>
        <p className="text-gray-600 mt-1">Quick access to your most important tasks and recent activity</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4" /> Active KPIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalKpis || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Across organization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" /> Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalUsers || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pending Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{dashboard?.pendingReviews || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Anomalies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboard?.openAnomalies || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Flagged for review</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks you can perform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto flex-col py-4">
              <Target className="w-5 h-5 mb-2" />
              <span className="text-xs">Create KPI</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
              <Users className="w-5 h-5 mb-2" />
              <span className="text-xs">Add User</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
              <FileText className="w-5 h-5 mb-2" />
              <span className="text-xs">View Reports</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
              <BarChart3 className="w-5 h-5 mb-2" />
              <span className="text-xs">Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-600">{activity.details}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(activity.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BSC Perspectives */}
      <Card>
        <CardHeader>
          <CardTitle>Balanced Scorecard Perspectives</CardTitle>
          <CardDescription>Performance across all BSC dimensions</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboard?.perspectives && dashboard.perspectives.length > 0 ? (
            <div className="space-y-4">
              {dashboard.perspectives.map((perspective: any) => (
                <div key={perspective.name}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">{perspective.name}</span>
                    <span className="text-sm font-bold">{perspective.score}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${perspective.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No perspective data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Total Assignments</CardTitle>
          <CardDescription>KPI assignments across the organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">{dashboard?.totalAssignments || 0}</div>
            <p className="text-gray-600 mt-2">Active KPI assignments</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
