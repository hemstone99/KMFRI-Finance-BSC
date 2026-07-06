import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, TrendingUp, Users, CheckCircle, AlertCircle } from "lucide-react";

export default function ManagersView() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const { data: assignments } = trpc.assignments.myAssignments.useQuery();
  const { data: users } = trpc.users.list.useQuery();

  // Filter assignments for HODs managed by current user
  const managedAssignments = assignments?.filter((a: any) => {
    if (user?.roleId === 1) {
      // ADFA sees all
      return true;
    } else if (user?.roleId === 2 || user?.roleId === 3) {
      // HOD sees their team
      return a.assignedById === user.id;
    }
    return false;
  }) || [];

  // Group by assignee
  const groupedByAssignee = managedAssignments.reduce((acc: any, assignment: any) => {
    const assigneeId = assignment.assignedToId;
    if (!acc[assigneeId]) {
      acc[assigneeId] = [];
    }
    acc[assigneeId].push(assignment);
    return acc;
  }, {});

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "SUBMITTED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Managers View</h1>
        <p className="text-gray-600 mt-1">Monitor team performance and KPI progress</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search team members or KPIs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Team Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance Overview</CardTitle>
          <CardDescription>Summary of all team members' KPI progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(groupedByAssignee).length > 0 ? (
              Object.entries(groupedByAssignee).map(([assigneeId, assignments]: [string, any]) => {
                const assignee = users?.find((u: any) => u.id === parseInt(assigneeId));
                const totalAssignments = assignments.length;
                const approvedCount = assignments.filter((a: any) => a.status === "APPROVED").length;
                const pendingCount = assignments.filter((a: any) => a.status === "PENDING").length;
                const completionRate = totalAssignments > 0 ? Math.round((approvedCount / totalAssignments) * 100) : 0;

                return (
                  <div key={assigneeId} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{assignee?.name || "Unknown User"}</h3>
                        <p className="text-sm text-gray-600">{assignee?.roleName}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">{totalAssignments} KPIs</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-2 bg-green-50 rounded">
                        <p className="text-xs text-gray-600">Approved</p>
                        <p className="text-lg font-bold text-green-600">{approvedCount}</p>
                      </div>
                      <div className="p-2 bg-yellow-50 rounded">
                        <p className="text-xs text-gray-600">Pending</p>
                        <p className="text-lg font-bold text-yellow-600">{pendingCount}</p>
                      </div>
                      <div className="p-2 bg-blue-50 rounded">
                        <p className="text-xs text-gray-600">Completion</p>
                        <p className="text-lg font-bold text-blue-600">{completionRate}%</p>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No team members assigned</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" /> Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {managedAssignments.filter((a: any) => a.status === "APPROVED").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" /> Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {managedAssignments.filter((a: any) => a.status === "PENDING").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managedAssignments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(groupedByAssignee).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Assignments</CardTitle>
          <CardDescription>All KPI assignments under your management</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-2 mt-4">
              {managedAssignments.length > 0 ? (
                managedAssignments.map((assignment: any) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">KPI #{assignment.id}</p>
                      <p className="text-sm text-gray-600">Target: {assignment.targetValue}</p>
                    </div>
                    <Badge className={getStatusColor(assignment.status)}>{assignment.status}</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No assignments found</div>
              )}
            </TabsContent>

            {["approved", "pending", "rejected"].map((status) => (
              <TabsContent key={status} value={status} className="space-y-2 mt-4">
                {managedAssignments.filter((a: any) => a.status === status.toUpperCase()).length > 0 ? (
                  managedAssignments
                    .filter((a: any) => a.status === status.toUpperCase())
                    .map((assignment: any) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">KPI #{assignment.id}</p>
                          <p className="text-sm text-gray-600">Target: {assignment.targetValue}</p>
                        </div>
                        <Badge className={getStatusColor(assignment.status)}>{assignment.status}</Badge>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-gray-500">No {status} assignments</div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
