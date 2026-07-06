import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Pending", color: "text-gray-600", bg: "bg-gray-100" },
  ACCEPTED: { label: "Accepted", color: "text-blue-700", bg: "bg-blue-100" },
  IN_PROGRESS: { label: "In Progress", color: "text-yellow-700", bg: "bg-yellow-100" },
  SUBMITTED: { label: "Submitted", color: "text-purple-700", bg: "bg-purple-100" },
  APPROVED: { label: "Approved", color: "text-green-700", bg: "bg-green-100" },
  REJECTED: { label: "Rejected", color: "text-red-700", bg: "bg-red-100" },
};

const PERSPECTIVE_COLORS: Record<string, string> = {
  FINANCIAL: "border-l-emerald-500",
  CUSTOMER: "border-l-blue-500",
  INTERNAL: "border-l-amber-500",
  LEARNING: "border-l-purple-500",
};

export default function MyKPIs() {
  const { data: assignments, isLoading } = trpc.assignments.myAssignments.useQuery();

  const total = (assignments ?? []).length;
  const approved = (assignments ?? []).filter(a => a.status === "APPROVED").length;
  const pending = (assignments ?? []).filter(a => ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(a.status ?? "")).length;
  const submitted = (assignments ?? []).filter(a => a.status === "SUBMITTED").length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-['Poppins']">My KPI Assignments</h1>
        <p className="text-gray-500 text-sm mt-1">Track and manage your assigned Key Performance Indicators</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Assigned", value: total, icon: Target, color: "#3b82f6" },
          { label: "Pending Action", value: pending, icon: Clock, color: "#f59e0b" },
          { label: "Submitted", value: submitted, icon: AlertCircle, color: "#8b5cf6" },
          { label: "Approved", value: approved, icon: CheckCircle2, color: "#10b981" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                </div>
                <div className="p-2 rounded-xl" style={{ backgroundColor: `${s.color}15` }}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading your KPIs...</div>
      ) : (assignments ?? []).length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Target className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No KPI assignments yet</p>
            <p className="text-gray-400 text-sm mt-1">Your HOD will assign KPIs to you. Check back soon.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(assignments ?? []).map(a => {
            const status = STATUS_CONFIG[a.status ?? "PENDING"];
            const borderColor = PERSPECTIVE_COLORS[a.kpiPerspective ?? "FINANCIAL"];
            return (
              <Card key={a.id} className={cn("border-0 shadow-sm border-l-4 kmfri-card-hover", borderColor)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-800 truncate">{a.kpiName}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Assigned by: <span className="font-medium">{a.assignedByName}</span>
                      </p>
                    </div>
                    <Badge className={cn("text-xs ml-2 shrink-0", status.bg, status.color)}>
                      {status.label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-400">Target</p>
                      <p className="font-semibold text-gray-800">{a.targetValue ?? a.kpiTarget} <span className="text-xs font-normal text-gray-500">{a.kpiUnit}</span></p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-400">Period</p>
                      <p className="font-semibold text-gray-800">{a.period}</p>
                    </div>
                  </div>
                  {a.dueDate && (
                    <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Due: {new Date(a.dueDate).toLocaleDateString("en-KE")}
                    </p>
                  )}
                  {a.notes && <p className="text-xs text-gray-500 mt-2 italic border-t pt-2">{a.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
