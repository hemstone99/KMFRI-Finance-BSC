import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Calendar, CheckCircle, XCircle, Clock, Plus } from "lucide-react";
import { toast } from "sonner";

export default function LeaveManagement() {
  const { user } = useAuth();
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: "ANNUAL",
    startDate: "",
    endDate: "",
    days: 0,
    reason: "",
  });

  const { data: leaveRequests, isLoading, refetch } = trpc.leave.list.useQuery();
  const { data: leaveBalance } = trpc.leave.balance.useQuery();
  const submitMutation = trpc.leave.submit.useMutation();
  const approveMutation = trpc.leave.approve.useMutation();
  const rejectMutation = trpc.leave.reject.useMutation();

  // HODs are roleId 2 (Principal Accountant) and roleId 3 (Senior Accountant)
  // ADFA is roleId 1
  const isHodOrAdfa = user?.roleId && user.roleId <= 3;

  const handleSubmit = async () => {
    if (!formData.startDate || !formData.endDate || formData.days <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await submitMutation.mutateAsync(formData);
      toast.success("Leave request submitted successfully");
      setFormData({ leaveType: "ANNUAL", startDate: "", endDate: "", days: 0, reason: "" });
      setOpenDialog(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit leave request");
    }
  };

  const handleApprove = async (id: number, notes: string) => {
    try {
      await approveMutation.mutateAsync({ id, notes });
      toast.success("Leave approved");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve leave");
    }
  };

  const handleReject = async (id: number, notes: string) => {
    try {
      await rejectMutation.mutateAsync({ id, notes });
      toast.success("Leave rejected");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject leave");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Generate calendar for the current month
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const calendarDays = [];
  
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-1">Manage your leave requests and approvals</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Leave Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Leave Type</Label>
                <Select value={formData.leaveType} onValueChange={(v) => setFormData({ ...formData, leaveType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                    <SelectItem value="SICK">Sick Leave</SelectItem>
                    <SelectItem value="COMPASSIONATE">Compassionate Leave</SelectItem>
                    <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
                    <SelectItem value="PATERNITY">Paternity Leave</SelectItem>
                    <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Number of Days</Label>
                <Input type="number" min="1" value={formData.days} onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="Provide reason for leave" />
              </div>
              <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700">Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Balance */}
      {leaveBalance && leaveBalance.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {leaveBalance.map((balance) => (
            <Card key={balance.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{balance.leaveType}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{balance.remainingDays}</div>
                <p className="text-xs text-gray-600 mt-1">of {balance.totalDays} days remaining</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Leave Calendar - {monthName}
          </CardTitle>
          <CardDescription>View your leave schedule for the current month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
            {calendarDays.map((day, idx) => (
              <div
                key={idx}
                className={`p-2 text-center rounded ${
                  day === null
                    ? "bg-gray-50"
                    : day === today.getDate()
                    ? "bg-blue-100 font-bold border-2 border-blue-500"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                {day}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle>{isHodOrAdfa ? "Pending Leave Requests" : "My Leave Requests"}</CardTitle>
          <CardDescription>View and manage leave requests</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : leaveRequests && leaveRequests.length > 0 ? (
            <div className="space-y-4">
              {leaveRequests.map((leave: any) => (
                <div key={leave.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{leave.leaveType} Leave</h3>
                      <p className="text-sm text-gray-600">{leave.startDate} to {leave.endDate} ({leave.days} days)</p>
                    </div>
                    {getStatusBadge(leave.status)}
                  </div>
                  {leave.reason && <p className="text-sm text-gray-700">{leave.reason}</p>}
                  {isHodOrAdfa && leave.status === "PENDING" && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(leave.id, "Approved")}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(leave.id, "Rejected")}>Reject</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No leave requests found</div>
          )}
        </CardContent>
      </Card>

      {/* Leave Policy */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Leave Policy</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>• All leave requests must be submitted at least 5 working days in advance</p>
          <p>• Leave requests are routed to your HOD and ADFA for approval</p>
          <p>• Annual leave must be taken within the calendar year</p>
          <p>• Sick leave requires supporting medical documentation for absences exceeding 3 days</p>
          <p>• Compassionate leave is subject to verification and approval</p>
        </CardContent>
      </Card>
    </div>
  );
}
