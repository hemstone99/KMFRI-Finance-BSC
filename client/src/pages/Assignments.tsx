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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, ArrowRight, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  ACCEPTED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  SUBMITTED: "bg-purple-100 text-purple-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function Assignments() {
  const { data: user } = trpc.auth.me.useQuery();
  const roleId = (user as any)?.roleId ?? 3;

  const [assignOpen, setAssignOpen] = useState(false);
  const [form, setForm] = useState({ kpiId: "", assignedToId: "", targetValue: "", period: "", dueDate: "", notes: "" });

  const { data: myAssignments, refetch: refetchMine } = trpc.assignments.myAssignments.useQuery();
  const { data: assignedByMe, refetch: refetchByMe } = trpc.assignments.assignedByMe.useQuery();
  const { data: allAssignments } = trpc.assignments.all.useQuery();
  const { data: kpis } = trpc.kpis.list.useQuery();
  const { data: hods } = trpc.users.getHODs.useQuery();
  const { data: staff } = trpc.users.getMyTeam.useQuery();

  const assignToHODMutation = trpc.assignments.assignToHOD.useMutation({
    onSuccess: () => { toast.success("KPI assigned to HOD successfully"); setAssignOpen(false); refetchByMe(); },
    onError: (e) => toast.error(e.message),
  });

  const assignToStaffMutation = trpc.assignments.assignToStaff.useMutation({
    onSuccess: () => { toast.success("KPI assigned to staff successfully"); setAssignOpen(false); refetchByMe(); },
    onError: (e) => toast.error(e.message),
  });

  const handleAssign = () => {
    if (!form.kpiId || !form.assignedToId || !form.period) { toast.error("Please fill all required fields"); return; }
    const payload = {
      kpiId: parseInt(form.kpiId), assignedToId: parseInt(form.assignedToId),
      period: form.period, targetValue: form.targetValue || undefined,
      dueDate: form.dueDate || undefined, notes: form.notes || undefined,
    };
    if (roleId === 1) assignToHODMutation.mutate(payload);
    else assignToStaffMutation.mutate(payload);
  };

  const targetUsers = roleId === 1 ? (hods ?? []) : (staff ?? []);
  const canAssign = roleId <= 3;

  const AssignmentTable = ({ data }: { data: any[] }) => (
    data.length === 0 ? (
      <div className="p-12 text-center">
        <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400">No assignments found</p>
      </div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>KPI</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>{data[0]?.assignedByName !== undefined ? "Assigned By" : "Assigned To"}</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(a => (
            <TableRow key={a.id} className="hover:bg-gray-50">
              <TableCell>
                <div>
                  <p className="font-medium text-sm text-gray-800">{a.kpiName}</p>
                  {a.kpiPerspective && <p className="text-xs text-gray-400">{a.kpiPerspective}</p>}
                </div>
              </TableCell>
              <TableCell className="text-sm">{a.period}</TableCell>
              <TableCell className="text-sm">{a.targetValue ?? a.kpiTarget ?? "—"} {a.kpiUnit}</TableCell>
              <TableCell className="text-sm">{a.assignedByName ?? a.assignedToName ?? "—"}</TableCell>
              <TableCell><Badge className={cn("text-xs", STATUS_COLORS[a.status ?? "PENDING"])}>{a.status}</Badge></TableCell>
              <TableCell className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString("en-KE")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-['Poppins']">KPI Assignments</h1>
          <p className="text-gray-500 text-sm mt-1">
            {roleId === 1 ? "Assign KPIs to Principal & Senior Accountants (HODs)" : roleId <= 3 ? "Assign KPIs to your team members" : "View your KPI assignments"}
          </p>
        </div>
        {canAssign && (
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}>
                <Plus className="w-4 h-4" />
                {roleId === 1 ? "Assign to HOD" : "Assign to Staff"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  {roleId === 1 ? "Assign KPI to HOD" : "Assign KPI to Staff Member"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Select KPI *</Label>
                  <Select value={form.kpiId} onValueChange={v => setForm(p => ({ ...p, kpiId: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a KPI..." /></SelectTrigger>
                    <SelectContent>
                      {(kpis ?? []).filter(k => k.status === "ACTIVE").map(k => (
                        <SelectItem key={k.id} value={String(k.id)}>{k.name} ({k.perspective})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{roleId === 1 ? "Assign to (HOD)" : "Assign to (Staff)"} *</Label>
                  <Select value={form.assignedToId} onValueChange={v => setForm(p => ({ ...p, assignedToId: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select person..." /></SelectTrigger>
                    <SelectContent>
                      {targetUsers.map(u => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.name} — {u.roleName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Period *</Label>
                    <Input value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} placeholder="e.g., Q1 2025/26" className="mt-1" />
                  </div>
                  <div>
                    <Label>Target Value</Label>
                    <Input type="number" value={form.targetValue} onChange={e => setForm(p => ({ ...p, targetValue: e.target.value }))} placeholder="Override target" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Notes / Instructions</Label>
                  <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Add any specific instructions..." className="mt-1 h-20" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setAssignOpen(false)} className="flex-1">Cancel</Button>
                  <Button className="flex-1" style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}
                    onClick={handleAssign}
                    disabled={assignToHODMutation.isPending || assignToStaffMutation.isPending}>
                    {assignToHODMutation.isPending || assignToStaffMutation.isPending ? "Assigning..." : "Assign KPI"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue={roleId === 1 ? "all" : "mine"}>
        <TabsList className="bg-gray-100">
          {roleId === 1 && <TabsTrigger value="all">All Assignments</TabsTrigger>}
          <TabsTrigger value="mine">Assigned to Me</TabsTrigger>
          {canAssign && <TabsTrigger value="byMe">Assigned by Me</TabsTrigger>}
        </TabsList>

        {roleId === 1 && (
          <TabsContent value="all">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">All System Assignments ({(allAssignments ?? []).length})</CardTitle></CardHeader>
              <CardContent className="p-0"><AssignmentTable data={allAssignments ?? []} /></CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="mine">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">My Assignments ({(myAssignments ?? []).length})</CardTitle></CardHeader>
            <CardContent className="p-0"><AssignmentTable data={myAssignments ?? []} /></CardContent>
          </Card>
        </TabsContent>

        {canAssign && (
          <TabsContent value="byMe">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Assignments I Made ({(assignedByMe ?? []).length})</CardTitle></CardHeader>
              <CardContent className="p-0"><AssignmentTable data={assignedByMe ?? []} /></CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
