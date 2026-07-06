import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"];
const PERSPECTIVE_LABELS: Record<string, string> = { FINANCIAL: "Financial", CUSTOMER: "Customer", INTERNAL: "Internal", LEARNING: "Learning" };

export default function Reports() {
  const { data: summary } = trpc.dashboard.summary.useQuery();
  const { data: submissions } = trpc.kpiData.list.useQuery();
  const { data: anomalies } = trpc.anomalies.list.useQuery();

  const perspData = (summary?.perspectives ?? []).map(p => ({ name: PERSPECTIVE_LABELS[p.name] ?? p.name, score: p.score, target: 100 }));
  const pieData = (summary?.perspectives ?? []).map(p => ({ name: PERSPECTIVE_LABELS[p.name] ?? p.name, value: p.score }));

  const submissionsByStatus = [
    { name: "Pending", value: (submissions ?? []).filter(s => s.status === "PENDING").length },
    { name: "Approved", value: (submissions ?? []).filter(s => s.status === "APPROVED").length },
    { name: "Rejected", value: (submissions ?? []).filter(s => s.status === "REJECTED").length },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-['Poppins']">Reports & Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Performance insights and trend analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">BSC Perspective Scores</CardTitle></CardHeader>
          <CardContent>
            {perspData.length === 0 ? <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={perspData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`${v}%`]} />
                  <Bar dataKey="score" fill="#3b82f6" radius={[4,4,0,0]} name="Score" />
                  <Bar dataKey="target" fill="#e5e7eb" radius={[4,4,0,0]} name="Target" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Performance Distribution</CardTitle></CardHeader>
          <CardContent>
            {pieData.filter(p => p.value > 0).length === 0 ? <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData.filter(p => p.value > 0)} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v}%`]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Submission Status Overview</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={submissionsByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {submissionsByStatus.map((s, i) => <Cell key={i} fill={["#f59e0b","#10b981","#ef4444"][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">System Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              {[
                { label: "Total KPI Submissions", value: (submissions ?? []).length },
                { label: "Approval Rate", value: (submissions ?? []).length > 0 ? `${Math.round(((submissions ?? []).filter(s => s.status === "APPROVED").length / (submissions ?? []).length) * 100)}%` : "N/A" },
                { label: "Open Anomalies", value: (anomalies ?? []).filter(a => a.status === "OPEN").length },
                { label: "Active KPIs", value: summary?.totalKpis ?? 0 },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="font-semibold text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
