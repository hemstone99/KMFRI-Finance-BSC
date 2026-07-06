import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-blue-100 text-blue-700",
  CREATE_USER: "bg-green-100 text-green-700",
  CREATE_KPI: "bg-purple-100 text-purple-700",
  ASSIGN_KPI_HOD: "bg-amber-100 text-amber-700",
  ASSIGN_KPI_STAFF: "bg-orange-100 text-orange-700",
  SUBMIT_KPI_DATA: "bg-teal-100 text-teal-700",
};

export default function AuditLogs() {
  const { data: logs, isLoading } = trpc.audit.list.useQuery();

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-['Poppins']">Audit Logs</h1>
        <p className="text-gray-500 text-sm mt-1">Complete audit trail of all system activities</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Activity Log ({(logs ?? []).length} entries)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading audit logs...</div>
          ) : (logs ?? []).length === 0 ? (
            <div className="p-12 text-center">
              <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No audit logs yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logs ?? []).map(l => (
                  <TableRow key={l.id} className="hover:bg-gray-50">
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString("en-KE")}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{l.userName ?? "System"}</TableCell>
                    <TableCell><Badge className={ACTION_COLORS[l.action] ?? "bg-gray-100 text-gray-600"}>{l.action.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-sm text-gray-600">{l.module}</TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-64 truncate">{l.details}</TableCell>
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
