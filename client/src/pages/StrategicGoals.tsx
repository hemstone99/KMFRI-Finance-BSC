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
import { Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PERSPECTIVE_COLORS: Record<string, string> = {
  FINANCIAL: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CUSTOMER: "bg-blue-100 text-blue-700 border-blue-200",
  INTERNAL: "bg-amber-100 text-amber-700 border-amber-200",
  LEARNING: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function StrategicGoals() {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", perspective: "FINANCIAL", weight: "", fiscalYear: "2025/2026" });

  const { data: goals, isLoading, refetch } = trpc.strategicGoals.list.useQuery();
  const createMutation = trpc.strategicGoals.create.useMutation({
    onSuccess: () => { toast.success("Strategic goal created"); setCreateOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-['Poppins']">Strategic Goals</h1>
          <p className="text-gray-500 text-sm mt-1">Define and manage KMFRI's strategic objectives</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}>
              <Plus className="w-4 h-4" /> Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Strategic Goal</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="e.g., Improve Revenue Collection" className="mt-1" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="mt-1 h-20" /></div>
              <div><Label>BSC Perspective *</Label>
                <Select value={form.perspective} onValueChange={v => setForm(p => ({...p, perspective: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["FINANCIAL","CUSTOMER","INTERNAL","LEARNING"].map(p => <SelectItem key={p} value={p}>{p.charAt(0)+p.slice(1).toLowerCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Weight (%)</Label><Input type="number" value={form.weight} onChange={e => setForm(p => ({...p, weight: e.target.value}))} placeholder="25" className="mt-1" /></div>
                <div><Label>Fiscal Year</Label><Input value={form.fiscalYear} onChange={e => setForm(p => ({...p, fiscalYear: e.target.value}))} className="mt-1" /></div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">Cancel</Button>
                <Button className="flex-1" style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}
                  disabled={!form.title || createMutation.isPending}
                  onClick={() => createMutation.mutate({ title: form.title, description: form.description || undefined, perspective: form.perspective as any, weight: form.weight || undefined, fiscalYear: form.fiscalYear })}>
                  {createMutation.isPending ? "Creating..." : "Create Goal"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
       (goals ?? []).length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No strategic goals defined yet</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(goals ?? []).map(g => (
            <Card key={g.id} className="border-0 shadow-sm kmfri-card-hover">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">{g.title}</h3>
                  <Badge className={cn("text-xs ml-2 shrink-0", PERSPECTIVE_COLORS[g.perspective])}>
                    {g.perspective.charAt(0)+g.perspective.slice(1).toLowerCase()}
                  </Badge>
                </div>
                {g.description && <p className="text-sm text-gray-500 mb-3">{g.description}</p>}
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  {g.weight && <span>Weight: {g.weight}%</span>}
                  {g.fiscalYear && <span>FY: {g.fiscalYear}</span>}
                  <Badge className={g.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>{g.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
