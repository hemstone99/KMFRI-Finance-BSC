import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function ScorecardView() {
  const { user } = useAuth();
  const { data: dashboard } = trpc.dashboard.summary.useQuery();
  const { data: kpiData } = trpc.kpis.list.useQuery();

  // Prepare data for charts
  const perspectiveData = dashboard?.perspectives?.map((p: any) => ({
    name: p.name,
    score: p.score,
  })) || [];

  const statusData = [
    { name: "Approved", value: 0, color: "#10b981" },
    { name: "Pending", value: dashboard?.pendingReviews || 0, color: "#f59e0b" },
    { name: "Anomalies", value: dashboard?.openAnomalies || 0, color: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Balanced Scorecard</h1>
        <p className="text-gray-600 mt-1">Organization-wide KPI performance across BSC perspectives</p>
      </div>

      {/* Perspective Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Perspective Performance</CardTitle>
          <CardDescription>Score by BSC perspective</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={perspectiveData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="score" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Perspectives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {perspectiveData.map((perspective: any, idx: number) => (
          <Card key={perspective.name}>
            <CardHeader>
              <CardTitle className="text-lg">{perspective.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Score</span>
                    <span className="text-2xl font-bold text-blue-600">{perspective.score}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${perspective.score}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-green-50 rounded">
                    <p className="text-xs text-gray-600">Target</p>
                    <p className="text-lg font-bold text-green-600">100%</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded">
                    <p className="text-xs text-gray-600">Current</p>
                    <p className="text-lg font-bold text-blue-600">{perspective.score}%</p>
                  </div>
                  <div className="p-2 bg-amber-50 rounded">
                    <p className="text-xs text-gray-600">Gap</p>
                    <p className="text-lg font-bold text-amber-600">{100 - perspective.score}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Status</CardTitle>
          <CardDescription>KPI data submission and approval status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-4">
              {statusData.map((status) => (
                <div key={status.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                    <span className="font-medium text-gray-900">{status.name}</span>
                  </div>
                  <span className="text-lg font-bold">{status.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary by Perspective */}
      <Card>
        <CardHeader>
          <CardTitle>KPIs by Perspective</CardTitle>
          <CardDescription>Breakdown of active KPIs</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="internal">Internal</TabsTrigger>
              <TabsTrigger value="learning">Learning</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3">
              {kpiData && kpiData.length > 0 ? (
                <div className="space-y-2">
                  {kpiData.slice(0, 5).map((kpi: any) => (
                    <div key={kpi.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{kpi.name}</p>
                        <p className="text-xs text-gray-600">{kpi.perspective}</p>
                      </div>
                      <Badge>{kpi.perspective}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No KPIs found</div>
              )}
            </TabsContent>

            {["financial", "customer", "internal", "learning"].map((perspective) => (
              <TabsContent key={perspective} value={perspective} className="space-y-3">
                {kpiData && kpiData.filter((k: any) => k.perspective?.toLowerCase() === perspective).length > 0 ? (
                  <div className="space-y-2">
                    {kpiData
                      .filter((k: any) => k.perspective?.toLowerCase() === perspective)
                      .map((kpi: any) => (
                        <div key={kpi.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{kpi.name}</p>
                            <p className="text-xs text-gray-600">Target: {kpi.targetValue}</p>
                          </div>
                          <Badge>{perspective}</Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No KPIs in this perspective</div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Overall BSC Score */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle>Overall BSC Score</CardTitle>
          <CardDescription>Average performance across all perspectives</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-6xl font-bold text-blue-600">
              {perspectiveData.length > 0
                ? Math.round(perspectiveData.reduce((sum: number, p: any) => sum + p.score, 0) / perspectiveData.length)
                : 0}
              %
            </div>
            <p className="text-gray-600 mt-2">Organization-wide performance</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
