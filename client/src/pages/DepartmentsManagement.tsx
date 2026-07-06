import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Building2, Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DepartmentsManagement() {
  const { data: departments, isLoading, refetch } = trpc.departments.list.useQuery();
  const createMutation = trpc.departments.create.useMutation();
  const updateMutation = trpc.departments.update.useMutation();
  const deleteMutation = trpc.departments.delete.useMutation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", description: "", headId: 0 });
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Department name is required");
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        headId: formData.headId || undefined,
      });
      toast.success("Department created successfully");
      setFormData({ name: "", code: "", description: "", headId: 0 });
      setIsCreateOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to create department");
    }
  };

  const handleEdit = async () => {
    if (!formData.name.trim()) {
      toast.error("Department name is required");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editingId!,
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        headId: formData.headId || undefined,
      });
      toast.success("Department updated successfully");
      setFormData({ name: "", code: "", description: "", headId: 0 });
      setIsEditOpen(false);
      setEditingId(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to update department");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      toast.success("Department deleted successfully");
      setDeleteId(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete department");
    }
  };

  const openEditDialog = (dept: any) => {
    setFormData({
      name: dept.name,
      code: dept.code || "",
      description: dept.description || "",
      headId: dept.headId || 0,
    });
    setEditingId(dept.id);
    setIsEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departments Management</h1>
          <p className="text-gray-600 mt-1">Create and manage organizational departments</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> New Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
              <DialogDescription>Add a new department to your organization</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Department Name *</Label>
                <Input
                  placeholder="e.g., Finance"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Department Code</Label>
                <Input
                  placeholder="e.g., FIN"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Department description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Department
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!departments || departments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-600 text-center">No departments created yet</p>
            <p className="text-sm text-gray-500 text-center mt-1">Create your first department to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {departments.map((dept: any) => (
            <Card key={dept.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      {dept.name}
                    </CardTitle>
                    {dept.code && <p className="text-sm text-gray-600 mt-1">Code: {dept.code}</p>}
                    {dept.description && <p className="text-sm text-gray-600 mt-1">{dept.description}</p>}
                    {dept.headName && <p className="text-sm text-gray-600 mt-1">Head: {dept.headName}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(dept)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteId(dept.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update department information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Department Name *</Label>
              <Input
                placeholder="e.g., Finance"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Department Code</Label>
              <Input
                placeholder="e.g., FIN"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                placeholder="Department description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <Button onClick={handleEdit} disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Department
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this department? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
