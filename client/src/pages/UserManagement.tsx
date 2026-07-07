import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_COLORS: Record<string, string> = {
  "ADFA": "bg-blue-100 text-blue-800",
  "Principal Accountant": "bg-emerald-100 text-emerald-800",
  "Senior Accountant": "bg-teal-100 text-teal-800",
  "Accountant": "bg-slate-100 text-slate-700",
  "Assistant Accountant": "bg-gray-100 text-gray-700",
};

const DEFAULT_DEPARTMENT_OPTIONS = [
  "Functions",
  "Cash Office",
  "Payroll",
  "Tax",
  "Imprest",
  "Asset Management",
  "Payables",
  "Reconciliation",
  "Financial Reporting",
  "Examination",
];

export default function UserManagement() {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", employeeId: "", roleId: "4", departmentId: "" });

  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const { data: roles } = trpc.roles.list.useQuery();
  const { data: departments } = trpc.departments.list.useQuery();

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => { toast.success("User created successfully"); setCreateOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (users ?? []).filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-['Poppins']">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage KMFRI Finance Department staff accounts</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}>
              <Plus className="w-4 h-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Full Name *</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Enter full name" className="mt-1" /></div>
                <div className="col-span-2"><Label>Email Address *</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="name@kmfri.go.ke" className="mt-1" /></div>
                <div className="col-span-2"><Label>Password *</Label><Input type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} placeholder="Create a secure password" className="mt-1" /></div>
                <div><Label>Employee ID</Label><Input value={form.employeeId} onChange={e => setForm(p => ({...p, employeeId: e.target.value}))} placeholder="ADM-001" className="mt-1" /></div>
                <div><Label>Role *</Label>
                  <Select value={form.roleId} onValueChange={v => setForm(p => ({...p, roleId: v}))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(roles ?? []).map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Department</Label>
                  <Select value={form.departmentId} onValueChange={v => setForm(p => ({...p, departmentId: v}))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No department</SelectItem>
                      {(departments ?? []).length > 0 ? (departments ?? []).map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>) : DEFAULT_DEPARTMENT_OPTIONS.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">Cancel</Button>
                <Button className="flex-1" style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}
                  disabled={!form.name || !form.email || !form.password || createMutation.isPending}
                  onClick={() => createMutation.mutate({ name: form.name, email: form.email, password: form.password, employeeId: form.employeeId || undefined, roleId: parseInt(form.roleId), departmentId: form.departmentId && form.departmentId !== "none" ? parseInt(form.departmentId) : undefined })}>
                  {createMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" />Users ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-gray-400">Loading users...</div> :
           filtered.length === 0 ? (
            <div className="p-12 text-center"><Users className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No users found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(u => (
                  <TableRow key={u.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-sm">{u.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{u.email}</TableCell>
                    <TableCell className="text-sm text-gray-500">{u.employeeId ?? "—"}</TableCell>
                    <TableCell><Badge className={cn("text-xs", ROLE_COLORS[u.roleName ?? ""] ?? "bg-gray-100 text-gray-600")}>{u.roleName ?? "—"}</Badge></TableCell>
                    <TableCell className="text-sm text-gray-500">{u.deptName ?? "—"}</TableCell>
                    <TableCell><Badge className={u.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{u.status}</Badge></TableCell>
                    <TableCell className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString("en-KE")}</TableCell>
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
