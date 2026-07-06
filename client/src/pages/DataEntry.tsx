import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Activity, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DataEntry() {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [form, setForm] = useState({ actualValue: "", notes: "", evidenceUrl: "" });

  const { data: assignments } = trpc.assignments.myAssignments.useQuery();
  const { data: submissions, refetch } = trpc.kpiData.list.useQuery();

  const submitMutation = trpc.kpiData.submit.useMutation({
    onSuccess: () => {
      toast.success("KPI data submitted successfully! Your supervisor has been notified.");
      setSubmitOpen(false);
      setForm({ actualValue: "", notes: "", evidenceUrl: "" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const pendingAssignments = (assignments ?? []).filter(a => ["PENDING","ACCEPTED","IN_PROGRESS"].includes(a.status ?? ""));

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-['Poppins']">KPI Data Entry</h1>
        <p className="text-gray-500 text-sm mt-1">Submit your actual performance data for assigned KPIs</p>
      </div>

      {pendingAssignments.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <p className="font-medium text-sm text-amber-700">{pendingAssignments.length} KPI(s) awaiting your data submission</p>
            </div>
            <div className="space-y-2">
              {pendingAssignments.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-gray-800">{a.kpiName}</p>
                    <p className="text-xs text-gray-500">Target: {a.targetValue ?? a.kpiTarget} {a.kpiUnit} · Period: {a.period}</p>
                  </div>
                  <Button size="sm" className="gap-1.5" style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}
                    onClick={() => { setSelectedAssignment(a); setSubmitOpen(true); }}>
                    <Upload className="w-3 h-3" /> Submit
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit KPI Data</DialogTitle>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-4 mt-2">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-sm text-blue-800">{selectedAssignment.kpiName}</p>
                <p className="text-xs text-blue-600">Target: {selectedAssignment.targetValue ?? selectedAssignment.kpiTarget} {selectedAssignment.kpiUnit} · Period: {selectedAssignment.period}</p>
              </div>
              <div>
                <Label>Actual Value *</Label>
                <Input type="number" value={form.actualValue} onChange={e => setForm(p => ({ ...p, actualValue: e.target.value }))}
                  placeholder={`Enter actual value (target: ${selectedAssignment.targetValue ?? selectedAssignment.kpiTarget})`} className="mt-1" />
              </div>
              <div>
                <Label>Notes / Explanation</Label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Explain any deviations from target..." className="mt-1 h-20" />
              </div>
              <div>
                <Label>Evidence URL (optional)</Label>
                <Input value={form.evidenceUrl} onChange={e => setForm(p => ({ ...p, evidenceUrl: e.target.value }))}
                  placeholder="Link to supporting document" className="mt-1" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSubmitOpen(false)} className="flex-1">Cancel</Button>
                <Button className="flex-1" style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}
                  disabled={!form.actualValue || submitMutation.isPending}
                  onClick={() => submitMutation.mutate({
                    kpiId: selectedAssignment.kpiId,
                    assignmentId: selectedAssignment.id,
                    actualValue: form.actualValue,
                    period: selectedAssignment.period,
                    notes: form.notes || undefined,
                    evidenceUrl: form.evidenceUrl || undefined,
                  })}>
                  {submitMutation.isPending ? "Submitting..." : "Submit Data"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> My Submissions ({(submissions ?? []).length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(submissions ?? []).length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No submissions yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>KPI</TableHead>
                  <TableHead>Actual Value</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(submissions ?? []).map(s => {
                  const statusColors: Record<string,string> = { PENDING: "bg-gray-100 text-gray-600", APPROVED: "bg-green-100 text-green-700", REJECTED: "bg-red-100 text-red-700" };
                  const actual = parseFloat(s.actualValue as string);
                  const target = parseFloat(s.kpiTarget as string);
                  const pct = target > 0 ? Math.round((actual/target)*100) : 0;
                  return (
                    <TableRow key={s.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-sm">{s.kpiName}</TableCell>
                      <TableCell>
                        <span className="font-semibold">{s.actualValue}</span>
                        <span className="text-xs text-gray-400 ml-1">{s.kpiUnit}</span>
                        <span className={cn("text-xs ml-2", pct >= 100 ? "text-green-600" : pct >= 80 ? "text-yellow-600" : "text-red-500")}>({pct}%)</span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{s.kpiTarget} {s.kpiUnit}</TableCell>
                      <TableCell className="text-sm">{s.period}</TableCell>
                      <TableCell><Badge className={cn("text-xs", statusColors[s.status ?? "PENDING"])}>{s.status}</Badge></TableCell>
                      <TableCell className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString("en-KE")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
