import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function Departments() {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const { data: departments, isLoading, refetch } = trpc.departments.list.useQuery();
  const createMutation = trpc.departments.create.useMutation({
    onSuccess: () => { toast.success("Department created"); setCreateOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-['Poppins']">Departments</h1>
          <p className="text-gray-500 text-sm mt-1">Manage Finance Department units</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}>
              <Plus className="w-4 h-4" /> Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Department</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><Label>Department Name *</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g., Revenue Collection" className="mt-1" /></div>
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value}))} placeholder="e.g., RC-001" className="mt-1" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="mt-1 h-20" /></div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">Cancel</Button>
                <Button className="flex-1" style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}
                  disabled={!form.name || createMutation.isPending}
                  onClick={() => createMutation.mutate({ name: form.name, code: form.code || undefined, description: form.description || undefined })}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
       (departments ?? []).length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No departments yet</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(departments ?? []).map(d => (
            <Card key={d.id} className="border-0 shadow-sm kmfri-card-hover">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-50 rounded-xl"><Building2 className="w-5 h-5 text-blue-600" /></div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-800">{d.name}</h3>
                    {d.code && <p className="text-xs text-gray-400 mt-0.5">Code: {d.code}</p>}
                    {d.description && <p className="text-sm text-gray-500 mt-2">{d.description}</p>}
                    {d.headName && <p className="text-xs text-blue-600 mt-2">Head: {d.headName}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
