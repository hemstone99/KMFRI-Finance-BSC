import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ShieldAlert, CheckCircle2, Search, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  CRITICAL: { label: "Critical", color: "text-red-700", bg: "bg-red-100", dot: "bg-red-500" },
  HIGH: { label: "High", color: "text-orange-700", bg: "bg-orange-100", dot: "bg-orange-500" },
  MEDIUM: { label: "Medium", color: "text-yellow-700", bg: "bg-yellow-100", dot: "bg-yellow-500" },
  LOW: { label: "Low", color: "text-blue-700", bg: "bg-blue-100", dot: "bg-blue-500" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Open", color: "bg-red-100 text-red-700" },
  INVESTIGATING: { label: "Investigating", color: "bg-yellow-100 text-yellow-700" },
  RESOLVED: { label: "Resolved", color: "bg-green-100 text-green-700" },
  DISMISSED: { label: "Dismissed", color: "bg-gray-100 text-gray-600" },
};

const TYPE_LABELS: Record<string, string> = {
  THRESHOLD_BREACH: "Threshold Breach",
  OUT_OF_RANGE: "Out of Range",
  SUDDEN_SPIKE: "Sudden Spike",
  SUDDEN_DROP: "Sudden Drop",
  DUPLICATE_ENTRY: "Duplicate Entry",
  MISSING_DATA: "Missing Data",
  INCONSISTENT_DATA: "Inconsistent Data",
};

export default function Anomalies() {
  const { data: anomalies, isLoading, refetch } = trpc.anomalies.list.useQuery();
  const { data: stats } = trpc.anomalies.stats.useQuery();

  const updateMutation = trpc.anomalies.updateStatus.useMutation({
    onSuccess: () => { toast.success("Anomaly status updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const open = (anomalies ?? []).filter(a => a.status === "OPEN");
  const critical = (anomalies ?? []).filter(a => a.severity === "CRITICAL");

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-['Poppins']">Anomaly Detection</h1>
        <p className="text-gray-500 text-sm mt-1">Automated detection of mismatched, out-of-range, or inconsistent KPI data</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Detected", value: stats?.total ?? 0, color: "#6366f1", icon: Activity },
          { label: "Open", value: stats?.open ?? 0, color: "#ef4444", icon: AlertTriangle },
          { label: "Critical", value: stats?.critical ?? 0, color: "#dc2626", icon: ShieldAlert },
          { label: "Resolved", value: stats?.resolved ?? 0, color: "#10b981", icon: CheckCircle2 },
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

      {/* Critical Alert Banner */}
      {critical.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700">⚠️ {critical.length} Critical Anomaly{critical.length > 1 ? "ies" : ""} Detected</p>
            <p className="text-sm text-red-600 mt-0.5">Immediate attention required. These anomalies indicate severe data inconsistencies.</p>
          </div>
        </div>
      )}

      {/* Anomaly Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Detected Anomalies ({(anomalies ?? []).length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Scanning for anomalies...</div>
          ) : (anomalies ?? []).length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No anomalies detected</p>
              <p className="text-gray-400 text-sm mt-1">All KPI data appears consistent and within expected ranges</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Severity</TableHead>
                  <TableHead>KPI</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Expected Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(anomalies ?? []).map(a => {
                  const sev = SEVERITY_CONFIG[a.severity ?? "MEDIUM"];
                  const stat = STATUS_CONFIG[a.status ?? "OPEN"];
                  return (
                    <TableRow key={a.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", sev.dot)} />
                          <Badge className={cn("text-xs", sev.bg, sev.color)}>{sev.label}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{a.kpiName}</p>
                          {a.kpiPerspective && <p className="text-xs text-gray-400">{a.kpiPerspective}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{TYPE_LABELS[a.anomalyType ?? ""] ?? a.anomalyType}</TableCell>
                      <TableCell className="text-xs text-gray-600 max-w-48">{a.description}</TableCell>
                      <TableCell className="font-semibold text-sm">{a.actualValue}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {a.expectedMin || a.expectedMax ? `${a.expectedMin ?? "—"} – ${a.expectedMax ?? "—"}` : "—"}
                      </TableCell>
                      <TableCell><Badge className={cn("text-xs", stat.color)}>{stat.label}</Badge></TableCell>
                      <TableCell>
                        {a.status !== "RESOLVED" && a.status !== "DISMISSED" && (
                          <Select onValueChange={v => updateMutation.mutate({ id: a.id, status: v as any })}>
                            <SelectTrigger className="h-7 text-xs w-32">
                              <SelectValue placeholder="Update..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INVESTIGATING">Investigate</SelectItem>
                              <SelectItem value="RESOLVED">Resolve</SelectItem>
                              <SelectItem value="DISMISSED">Dismiss</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detection Rules Info */}
      <Card className="border-0 shadow-sm bg-blue-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-blue-800">Detection Rules Active</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { rule: "Threshold Breach", desc: "Value outside min/max bounds" },
              { rule: "Out of Range", desc: ">50% deviation from target" },
              { rule: "Sudden Spike/Drop", desc: ">40% change vs recent history" },
              { rule: "Duplicate Entry", desc: "Identical value submitted twice" },
            ].map(r => (
              <div key={r.rule} className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="text-xs font-semibold text-blue-700">{r.rule}</p>
                <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
