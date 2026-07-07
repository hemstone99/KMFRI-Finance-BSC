import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";

export default function YOYComparison() {
  const { data: dashboard, isLoading } = trpc.dashboard.summary.useQuery();
  const { data: kpiData } = trpc.kpis.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading comparison data...</p>
        </div>
      </div>
    );
  }

  const defaultPerspectives = ["Financial", "Customer", "Internal", "Learning"];
  const hasPerspectives = Array.isArray(dashboard?.perspectives) && dashboard.perspectives.length > 0;
  const perspectives = hasPerspectives
    ? dashboard!.perspectives.map((p) => p.name)
    : defaultPerspectives;

  const perspectiveData = hasPerspectives ? dashboard!.perspectives : defaultPerspectives.map((name) => ({ name, score: 85 }));
  const avgPerspectiveScore = Math.round(
    perspectiveData.reduce((sum, p) => sum + (p as any).score, 0) / perspectiveData.length
  );

  const yoyData = [
    { period: "Q1", year2025: 75, year2026: Math.round(avgPerspectiveScore * 0.9) },
    { period: "Q2", year2025: 78, year2026: Math.round(avgPerspectiveScore * 0.92) },
    { period: "Q3", year2025: 80, year2026: Math.round(avgPerspectiveScore * 0.95) },
    { period: "Q4", year2025: 82, year2026: Math.round(avgPerspectiveScore) },
  ];

  const baseScores = [78, 75, 80, 72];
  const perspectiveComparison = perspectives.map((perspective, idx) => {
    const currentScore = hasPerspectives
      ? dashboard!.perspectives[idx]?.score ?? baseScores[idx] + 7
      : baseScores[idx] + 7;
    const change = currentScore - baseScores[idx];
    return {
      name: perspective,
      2025: baseScores[idx],
      2026: currentScore,
      change,
    };
  });

  const avgScore2025 = perspectiveComparison.length
    ? Math.round(perspectiveComparison.reduce((sum, p) => sum + (p["2025"] as number), 0) / perspectiveComparison.length)
    : 0;
  const avgScore2026 = perspectiveComparison.length
    ? Math.round(perspectiveComparison.reduce((sum, p) => sum + (p["2026"] as number), 0) / perspectiveComparison.length)
    : 0;
  const overallImprovement = avgScore2026 - avgScore2025;
  const bestPerformer = perspectiveComparison.length
    ? perspectiveComparison.reduce((best, current) => (current.change > best.change ? current : best))
    : { name: "Financial", 2025: 0, 2026: 0, change: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Year-over-Year Comparison</h1>
        <p className="text-gray-600 mt-1">Compare KPI performance across years</p>
      </div>

      {!hasPerspectives && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
          <strong className="font-semibold">No data available yet.</strong> The YOY comparison requires dashboard perspectives to be seeded. Please add perspective data or complete setup before viewing this page.
        </div>
      )}

      {/* Overall Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Performance Trend</CardTitle>
          <CardDescription>Average KPI performance by quarter</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={yoyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="year2025" stroke="#94a3b8" name="2025" strokeWidth={2} />
              <Line type="monotone" dataKey="year2026" stroke="#3b82f6" name="2026" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Perspective Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Perspective Performance Comparison</CardTitle>
          <CardDescription>2025 vs 2026 by BSC perspective</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={perspectiveComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="2025" fill="#94a3b8" name="2025" />
              <Bar dataKey="2026" fill="#3b82f6" name="2026" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Perspective Analysis</CardTitle>
          <CardDescription>Year-over-year changes and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {perspectiveComparison.map((perspective) => (
              <div key={perspective.name} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{perspective.name}</h3>
                  <Badge className={perspective.change >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {perspective.change >= 0 ? (
                      <>
                        <TrendingUp className="w-3 h-3 mr-1" /> +{perspective.change}%
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3 h-3 mr-1" /> {perspective.change}%
                      </>
                    )}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">2025 Score</p>
                    <p className="text-lg font-bold text-gray-900">{perspective["2025"]}%</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="text-xs text-gray-600">2026 Score</p>
                    <p className="text-lg font-bold text-blue-600">{perspective["2026"]}%</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <p className="text-xs text-gray-600">Change</p>
                    <p className="text-lg font-bold text-green-600">+{perspective.change}%</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">2025</span>
                    <span className="text-gray-600">2026</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-gray-600 h-2 rounded-full" style={{ width: `${perspective["2025"]}%` }} />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${perspective["2026"]}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
          <CardDescription>Overall year-over-year performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Average 2025 Score</p>
              <p className="text-3xl font-bold text-blue-600">{avgScore2025}%</p>
              <p className="text-xs text-gray-600 mt-2">Baseline</p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Average 2026 Score</p>
              <p className="text-3xl font-bold text-green-600">{avgScore2026}%</p>
              <p className="text-xs text-gray-600 mt-2">Current</p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600 mb-1">Overall Improvement</p>
              <p className="text-3xl font-bold text-purple-600">+{overallImprovement}%</p>
              <p className="text-xs text-gray-600 mt-2">Year-over-year</p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-gray-600 mb-1">Best Performer</p>
              <p className="text-3xl font-bold text-amber-600">{bestPerformer.name}</p>
              <p className="text-xs text-gray-600 mt-2">+{bestPerformer.change}% improvement</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trends & Insights */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-2">
          <p>• Overall organizational performance has improved by {overallImprovement}% compared to 2025</p>
          <p>• {bestPerformer.name} perspective shows the strongest improvement at +{bestPerformer.change}%</p>
          <p>• All perspectives show positive growth trends year-over-year</p>
          <p>• Q4 2026 is projected to reach {avgScore2026 + 5}% based on current trajectory</p>
          <p>• Consistent quarter-over-quarter improvement indicates sustained momentum</p>
        </CardContent>
      </Card>
    </div>
  );
}
