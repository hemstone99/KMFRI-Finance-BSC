import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Target, Search, Filter, Edit2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PERSPECTIVES = ["FINANCIAL", "CUSTOMER", "INTERNAL", "LEARNING"];
const PERSPECTIVE_COLORS: Record<string, string> = {
  FINANCIAL: "bg-emerald-100 text-emerald-700",
  CUSTOMER: "bg-blue-100 text-blue-700",
  INTERNAL: "bg-amber-100 text-amber-700",
  LEARNING: "bg-purple-100 text-purple-700",
};

export default function KPIManagement() {
  const [search, setSearch] = useState("");
  const [filterPerspective, setFilterPerspective] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", perspective: "FINANCIAL", targetValue: "",
    unit: "", frequency: "MONTHLY", baseline: "", minThreshold: "", maxThreshold: "",
    goalId: "", fiscalYear: "2025/2026",
  });

  const { data: kpis, isLoading, refetch } = trpc.kpis.list.useQuery();
  const { data: goals } = trpc.strategicGoals.list.useQuery();

  const createMutation = trpc.kpis.create.useMutation({
    onSuccess: () => {
      toast.success("KPI created successfully");
      setCreateOpen(false);
      setForm({ name: "", description: "", perspective: "FINANCIAL", targetValue: "", unit: "", frequency: "MONTHLY", baseline: "", minThreshold: "", maxThreshold: "", goalId: "", fiscalYear: "2025/2026" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (kpis ?? []).filter(k => {
    const matchSearch = k.name.toLowerCase().includes(search.toLowerCase());
    const matchP = filterPerspective === "ALL" || k.perspective === filterPerspective;
    return matchSearch && matchP;
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-['Poppins']">KPI Management</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage Key Performance Indicators</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}>
              <Plus className="w-4 h-4" /> Create KPI
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New KPI</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="col-span-2">
                <Label>KPI Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Revenue Collection Rate" className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe what this KPI measures..." className="mt-1 h-20" />
              </div>
              <div>
                <Label>BSC Perspective *</Label>
                <Select value={form.perspective} onValueChange={v => setForm(p => ({ ...p, perspective: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERSPECTIVES.map(p => <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frequency *</Label>
                <Select value={form.frequency} onValueChange={v => setForm(p => ({ ...p, frequency: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["DAILY","WEEKLY","MONTHLY","QUARTERLY","ANNUAL"].map(f => <SelectItem key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Value *</Label>
                <Input type="number" value={form.targetValue} onChange={e => setForm(p => ({ ...p, targetValue: e.target.value }))} placeholder="e.g., 95" className="mt-1" />
              </div>
              <div>
                <Label>Unit *</Label>
                <Input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="e.g., %, KES, days" className="mt-1" />
              </div>
              <div>
                <Label>Min Threshold</Label>
                <Input type="number" value={form.minThreshold} onChange={e => setForm(p => ({ ...p, minThreshold: e.target.value }))} placeholder="Minimum acceptable value" className="mt-1" />
              </div>
              <div>
                <Label>Max Threshold</Label>
                <Input type="number" value={form.maxThreshold} onChange={e => setForm(p => ({ ...p, maxThreshold: e.target.value }))} placeholder="Maximum acceptable value" className="mt-1" />
              </div>
              <div>
                <Label>Baseline</Label>
                <Input type="number" value={form.baseline} onChange={e => setForm(p => ({ ...p, baseline: e.target.value }))} placeholder="Starting value" className="mt-1" />
              </div>
              <div>
                <Label>Strategic Goal</Label>
                <Select value={form.goalId} onValueChange={v => setForm(p => ({ ...p, goalId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Link to goal (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No goal</SelectItem>
                    {(goals ?? []).map(g => <SelectItem key={g.id} value={String(g.id)}>{g.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fiscal Year</Label>
                <Input value={form.fiscalYear} onChange={e => setForm(p => ({ ...p, fiscalYear: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">Cancel</Button>
              <Button
                className="flex-1"
                style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}
                disabled={createMutation.isPending || !form.name || !form.targetValue || !form.unit}
                onClick={() => createMutation.mutate({
                  name: form.name, description: form.description || undefined,
                  perspective: form.perspective as any, targetValue: form.targetValue,
                  unit: form.unit, frequency: form.frequency as any,
                  baseline: form.baseline || undefined, minThreshold: form.minThreshold || undefined,
                  maxThreshold: form.maxThreshold || undefined,
                  goalId: form.goalId && form.goalId !== "none" ? parseInt(form.goalId) : undefined,
                  fiscalYear: form.fiscalYear,
                })}
              >
                {createMutation.isPending ? "Creating..." : "Create KPI"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search KPIs..." className="pl-9" />
            </div>
            <div className="flex gap-2">
              {["ALL", ...PERSPECTIVES].map(p => (
                <Button key={p} variant={filterPerspective === p ? "default" : "outline"} size="sm"
                  onClick={() => setFilterPerspective(p)}
                  className={filterPerspective === p ? "bg-blue-700" : ""}>
                  {p === "ALL" ? "All" : p.charAt(0) + p.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            KPIs ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading KPIs...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No KPIs found</p>
              <p className="text-gray-400 text-sm mt-1">Create your first KPI to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">KPI Name</TableHead>
                  <TableHead className="font-semibold">Perspective</TableHead>
                  <TableHead className="font-semibold">Target</TableHead>
                  <TableHead className="font-semibold">Frequency</TableHead>
                  <TableHead className="font-semibold">Thresholds</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(k => (
                  <TableRow key={k.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-800">{k.name}</p>
                        {k.goalTitle && <p className="text-xs text-gray-400 mt-0.5">Goal: {k.goalTitle}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", PERSPECTIVE_COLORS[k.perspective])}>
                        {k.perspective.charAt(0) + k.perspective.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{k.targetValue} {k.unit}</TableCell>
                    <TableCell className="text-sm text-gray-600">{k.frequency}</TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {k.minThreshold || k.maxThreshold ? `${k.minThreshold ?? "—"} to ${k.maxThreshold ?? "—"}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={k.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                        {k.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
