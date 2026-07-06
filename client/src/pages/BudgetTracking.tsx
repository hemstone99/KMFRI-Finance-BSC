import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";

export default function BudgetTracking() {
  const { user } = useAuth();
  const { data: budgets, isLoading } = trpc.budget.list.useQuery();

  if (user?.roleId !== 1 && user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Only ADFA can access budget tracking.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAllocated = budgets?.reduce((sum, b) => sum + parseFloat(b.allocatedAmount || "0"), 0) || 0;
  const totalSpent = budgets?.reduce((sum, b) => sum + parseFloat(b.spentAmount || "0"), 0) || 0;
  const totalRemaining = budgets?.reduce((sum, b) => sum + parseFloat(b.remainingAmount || "0"), 0) || 0;

  const chartData = budgets?.map((b) => ({
    name: `Dept ${b.departmentId}`,
    allocated: parseFloat(b.allocatedAmount || "0"),
    spent: parseFloat(b.spentAmount || "0"),
    remaining: parseFloat(b.remainingAmount || "0"),
  })) || [];

  const pieData = [
    { name: "Spent", value: totalSpent },
    { name: "Remaining", value: totalRemaining },
  ];

  const COLORS = ["#ef4444", "#10b981"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Budget Tracking</h1>
        <p className="text-gray-600 mt-1">Monitor departmental budget allocation and spending</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Total Allocated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totalAllocated.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">KES {totalSpent.toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-1">{((totalSpent / totalAllocated) * 100).toFixed(1)}% of budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">KES {totalRemaining.toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-1">{((totalRemaining / totalAllocated) * 100).toFixed(1)}% available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budgets?.length || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Total tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Budget by Department</CardTitle>
            <CardDescription>Allocated vs Spent vs Remaining</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center text-gray-500">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="allocated" fill="#3b82f6" />
                  <Bar dataKey="spent" fill="#ef4444" />
                  <Bar dataKey="remaining" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget Utilization</CardTitle>
            <CardDescription>Spent vs Remaining</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: KES ${value.toLocaleString()}`} outerRadius={80} fill="#8884d8" dataKey="value">
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Department Details */}
      <Card>
        <CardHeader>
          <CardTitle>Department Budget Details</CardTitle>
          <CardDescription>Detailed breakdown by department</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : budgets && budgets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-4 font-semibold">Department</th>
                    <th className="text-right py-2 px-4 font-semibold">Allocated</th>
                    <th className="text-right py-2 px-4 font-semibold">Spent</th>
                    <th className="text-right py-2 px-4 font-semibold">Remaining</th>
                    <th className="text-center py-2 px-4 font-semibold">Utilization</th>
                    <th className="text-center py-2 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((budget) => {
                    const utilization = (parseFloat(budget.spentAmount || "0") / parseFloat(budget.allocatedAmount || "1")) * 100;
                    return (
                      <tr key={budget.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">Dept {budget.departmentId}</td>
                        <td className="text-right py-3 px-4">KES {parseFloat(budget.allocatedAmount || "0").toLocaleString()}</td>
                        <td className="text-right py-3 px-4">KES {parseFloat(budget.spentAmount || "0").toLocaleString()}</td>
                        <td className="text-right py-3 px-4">KES {parseFloat(budget.remainingAmount || "0").toLocaleString()}</td>
                        <td className="text-center py-3 px-4">{utilization.toFixed(1)}%</td>
                        <td className="text-center py-3 px-4">
                          {budget.status === "ACTIVE" ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">{budget.status}</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No budget data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
