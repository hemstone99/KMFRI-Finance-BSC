import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Approvals() {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const { data: submissions, refetch } = trpc.kpiData.list.useQuery();
  const reviewMutation = trpc.kpiData.review.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`KPI data ${vars.status.toLowerCase()} successfully`);
      setRejectOpen(false);
      setReason("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const pending = (submissions ?? []).filter(s => s.status === "PENDING");
  const reviewed = (submissions ?? []).filter(s => s.status !== "PENDING");

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-['Poppins']">KPI Data Approvals</h1>
        <p className="text-gray-500 text-sm mt-1">Review and approve submitted KPI performance data</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending Review", value: pending.length, color: "#f59e0b", icon: Clock },
          { label: "Approved", value: (submissions ?? []).filter(s => s.status === "APPROVED").length, color: "#10b981", icon: CheckCircle2 },
          { label: "Rejected", value: (submissions ?? []).filter(s => s.status === "REJECTED").length, color: "#ef4444", icon: XCircle },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
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

      {/* Pending Approvals */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            Pending Approvals ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-200 mx-auto mb-3" />
              <p className="text-gray-400">All submissions have been reviewed</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>KPI</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Actual vs Target</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map(s => {
                  const actual = parseFloat(s.actualValue as string);
                  const target = parseFloat(s.kpiTarget as string);
                  const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
                  return (
                    <TableRow key={s.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-sm">{s.kpiName}</TableCell>
                      <TableCell className="text-sm">{s.submitterName}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-semibold">{s.actualValue}</span>
                          <span className="text-xs text-gray-400"> / {s.kpiTarget} {s.kpiUnit}</span>
                          <div className={cn("text-xs font-medium mt-0.5", pct >= 100 ? "text-green-600" : pct >= 80 ? "text-yellow-600" : "text-red-500")}>
                            {pct}% of target
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{s.period}</TableCell>
                      <TableCell className="text-xs text-gray-500 max-w-32 truncate">{s.notes ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => reviewMutation.mutate({ id: s.id, status: "APPROVED" })}>
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => { setSelectedId(s.id); setRejectOpen(true); }}>
                            <XCircle className="w-3 h-3" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reviewed History */}
      {reviewed.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Review History ({reviewed.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>KPI</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewed.map(s => (
                  <TableRow key={s.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-sm">{s.kpiName}</TableCell>
                    <TableCell className="text-sm">{s.submitterName}</TableCell>
                    <TableCell className="text-sm">{s.actualValue} {s.kpiUnit}</TableCell>
                    <TableCell className="text-sm">{s.period}</TableCell>
                    <TableCell>
                      <Badge className={s.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString("en-KE")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reject KPI Submission</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Rejection Reason *</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Explain why this submission is being rejected..." className="mt-1 h-24" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setRejectOpen(false)} className="flex-1">Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={!reason || reviewMutation.isPending}
                onClick={() => selectedId && reviewMutation.mutate({ id: selectedId, status: "REJECTED", rejectionReason: reason })}>
                {reviewMutation.isPending ? "Rejecting..." : "Reject Submission"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
