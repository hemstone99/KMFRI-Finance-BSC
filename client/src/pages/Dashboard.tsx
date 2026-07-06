import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { Target, Users, AlertTriangle, CheckCircle2, Clock, TrendingUp, Activity, FileText, ArrowUpRight, ArrowDownRight, ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PERSPECTIVE_COLORS: Record<string, string> = {
  FINANCIAL: "#10b981",
  CUSTOMER: "#3b82f6",
  INTERNAL: "#f59e0b",
  LEARNING: "#8b5cf6",
};

const PERSPECTIVE_LABELS: Record<string, string> = {
  FINANCIAL: "Financial",
  CUSTOMER: "Customer",
  INTERNAL: "Internal Process",
  LEARNING: "Learning & Growth",
};

export default function Dashboard() {
  const utils = trpc.useUtils();
  const { data: user } = trpc.auth.me.useQuery();
  const { data: summary, isLoading } = trpc.dashboard.summary.useQuery();
  const { data: myPerf } = trpc.dashboard.myKpiPerformance.useQuery();
  const { data: notifications } = trpc.notifications.list.useQuery();
  const { data: anomalyStats } = trpc.anomalies.stats.useQuery();
  const { data: setupStatus } = trpc.setup.status.useQuery(undefined, { staleTime: 30_000 });

  const claimAdfaMutation = trpc.setup.claimAdfa.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      utils.setup.status.invalidate();
      window.location.reload();
    },
  });

  const roleId = (user as any)?.roleId ?? 3;
  const roleName = (user as any)?.roleName ?? "Staff";

  const recentNotifs = (notifications ?? []).slice(0, 5);
  const unreadNotifs = (notifications ?? []).filter(n => !n.isRead);

  const radarData = (summary?.perspectives ?? []).map(p => ({
    subject: PERSPECTIVE_LABELS[p.name] ?? p.name,
    score: p.score,
    fullMark: 100,
  }));

  const StatCard = ({ title, value, icon: Icon, color, sub }: any) => (
    <Card className="border-0 shadow-sm kmfri-card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <div className="text-3xl font-bold mt-1" style={{ color }}>{isLoading ? <Skeleton className="h-8 w-16" /> : value}</div>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-['Poppins']">
            {roleId === 1 ? "ADFA Overview Dashboard" : roleId <= 3 ? "HOD Management Dashboard" : "My Performance Dashboard"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, <span className="font-medium text-gray-700">{user?.name}</span>
            {(user as any)?.deptName && <span className="text-gray-400"> · {(user as any).deptName}</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">FY 2025/2026</p>
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      {/* ADFA Claim Banner - shown when roles seeded but no ADFA yet */}
      {setupStatus && setupStatus.rolesSeeded && !setupStatus.hasAdfa && user?.role === "admin" && (
        <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 font-['Poppins']">Claim the ADFA Role</h3>
              <p className="text-sm text-gray-600 mt-1">
                The system has been initialized with all roles and departments, but no ADFA account has been assigned yet.
                As the system administrator, you can claim the <strong>Assistant Director Finance & Accounts (ADFA)</strong> role to begin managing KPIs.
              </p>
              <div className="flex gap-3 mt-3">
                <Button
                  onClick={() => claimAdfaMutation.mutate()}
                  disabled={claimAdfaMutation.isPending}
                  className="text-sm h-9"
                  style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}
                >
                  {claimAdfaMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Claiming...</> : "Claim ADFA Role"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {roleId === 1 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active KPIs" value={summary?.totalKpis ?? 0} icon={Target} color="#3b82f6" sub="Across all departments" />
          <StatCard title="System Users" value={summary?.totalUsers ?? 0} icon={Users} color="#10b981" sub="Active accounts" />
          <StatCard title="Open Anomalies" value={anomalyStats?.open ?? 0} icon={AlertTriangle} color={anomalyStats?.open ? "#ef4444" : "#10b981"} sub={anomalyStats?.critical ? `${anomalyStats.critical} critical` : "All clear"} />
          <StatCard title="Pending Reviews" value={summary?.pendingReviews ?? 0} icon={Clock} color="#f59e0b" sub="Awaiting approval" />
        </div>
      )}

      {(roleId === 2 || roleId === 3) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="My KPI Assignments" value={(myPerf ?? []).length} icon={Target} color="#3b82f6" sub="From ADFA" />
          <StatCard title="Team Assignments" value={summary?.totalAssignments ?? 0} icon={Users} color="#10b981" sub="Assigned to staff" />
          <StatCard title="Open Anomalies" value={anomalyStats?.open ?? 0} icon={AlertTriangle} color={anomalyStats?.open ? "#ef4444" : "#10b981"} sub="Require attention" />
          <StatCard title="Pending Reviews" value={summary?.pendingReviews ?? 0} icon={Clock} color="#f59e0b" sub="Staff submissions" />
        </div>
      )}

      {(roleId === 4 || roleId === 5) && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="My KPIs" value={(myPerf ?? []).length} icon={Target} color="#3b82f6" sub="Assigned to me" />
          <StatCard title="Submitted" value={(myPerf ?? []).filter(k => k.status === "SUBMITTED" || k.status === "APPROVED").length} icon={CheckCircle2} color="#10b981" sub="This period" />
          <StatCard title="Pending" value={(myPerf ?? []).filter(k => k.status === "PENDING" || k.status === "ACCEPTED").length} icon={Clock} color="#f59e0b" sub="Awaiting submission" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BSC Perspectives Chart */}
        {roleId <= 3 && radarData.length > 0 && (
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">BSC Perspectives Performance</CardTitle>
              <p className="text-xs text-muted-foreground">Average achievement vs target across all perspectives</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip formatter={(v: any) => [`${v}%`, "Score"]} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* My KPI Status */}
        {(roleId === 4 || roleId === 5) && (myPerf ?? []).length > 0 && (
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">My KPI Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(myPerf ?? []).slice(0, 6).map((kpi) => {
                  const statusColors: Record<string, string> = {
                    PENDING: "bg-gray-100 text-gray-600",
                    ACCEPTED: "bg-blue-100 text-blue-700",
                    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
                    SUBMITTED: "bg-purple-100 text-purple-700",
                    APPROVED: "bg-green-100 text-green-700",
                    REJECTED: "bg-red-100 text-red-700",
                  };
                  return (
                    <div key={kpi.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{kpi.kpiName}</p>
                        <p className="text-xs text-gray-500">Target: {kpi.kpiTarget} {kpi.kpiUnit} · {kpi.period}</p>
                      </div>
                      <Badge className={cn("text-xs shrink-0 ml-2", statusColors[kpi.status ?? "PENDING"])}>
                        {kpi.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Notifications */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Notifications</CardTitle>
              {unreadNotifs.length > 0 && (
                <Badge className="bg-red-500 text-white text-xs">{unreadNotifs.length} new</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentNotifs.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentNotifs.map((n) => {
                  const typeIcons: Record<string, { icon: string; color: string }> = {
                    KPI_ASSIGNED: { icon: "📋", color: "bg-blue-50" },
                    KPI_APPROVED: { icon: "✅", color: "bg-green-50" },
                    KPI_REJECTED: { icon: "❌", color: "bg-red-50" },
                    KPI_SUBMITTED: { icon: "📤", color: "bg-purple-50" },
                    ANOMALY_DETECTED: { icon: "⚠️", color: "bg-orange-50" },
                    INFO: { icon: "ℹ️", color: "bg-gray-50" },
                    WARNING: { icon: "⚠️", color: "bg-yellow-50" },
                    SUCCESS: { icon: "✅", color: "bg-green-50" },
                    ERROR: { icon: "❌", color: "bg-red-50" },
                  };
                  const meta = typeIcons[n.type] ?? typeIcons.INFO;
                  return (
                    <div key={n.id} className={cn("flex gap-3 p-2.5 rounded-lg transition-colors", meta.color, !n.isRead && "ring-1 ring-blue-200")}>
                      <span className="text-base shrink-0">{meta.icon}</span>
                      <div className="min-w-0">
                        <p className={cn("text-xs font-medium truncate", !n.isRead ? "text-gray-900" : "text-gray-600")}>{n.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleDateString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Perspective Breakdown (ADFA/HOD) */}
      {roleId <= 3 && (summary?.perspectives ?? []).length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Performance by BSC Perspective</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(summary?.perspectives ?? []).map((p) => (
                <div key={p.name} className={cn("p-4 rounded-xl", `perspective-${p.name.toLowerCase()}`)}>
                  <p className="text-xs font-medium text-gray-600 mb-2">{PERSPECTIVE_LABELS[p.name] ?? p.name}</p>
                  <p className="text-2xl font-bold text-gray-800">{p.score}%</p>
                  <Progress value={p.score} className="mt-2 h-1.5" />
                  <p className="text-xs text-gray-500 mt-1">
                    {p.score >= 80 ? "On Track" : p.score >= 60 ? "Needs Attention" : "Below Target"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
