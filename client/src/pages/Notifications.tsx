import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, BellOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { icon: string; bg: string; border: string }> = {
  KPI_ASSIGNED: { icon: "📋", bg: "bg-blue-50", border: "border-blue-100" },
  KPI_APPROVED: { icon: "✅", bg: "bg-green-50", border: "border-green-100" },
  KPI_REJECTED: { icon: "❌", bg: "bg-red-50", border: "border-red-100" },
  KPI_SUBMITTED: { icon: "📤", bg: "bg-purple-50", border: "border-purple-100" },
  ANOMALY_DETECTED: { icon: "⚠️", bg: "bg-orange-50", border: "border-orange-100" },
  INFO: { icon: "ℹ️", bg: "bg-gray-50", border: "border-gray-100" },
  WARNING: { icon: "⚠️", bg: "bg-yellow-50", border: "border-yellow-100" },
  SUCCESS: { icon: "✅", bg: "bg-green-50", border: "border-green-100" },
  ERROR: { icon: "❌", bg: "bg-red-50", border: "border-red-100" },
};

export default function Notifications() {
  const { data: notifications, isLoading, refetch } = trpc.notifications.list.useQuery(undefined, { refetchInterval: 15000 });
  const markReadMutation = trpc.notifications.markRead.useMutation({ onSuccess: () => refetch() });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({ onSuccess: () => { toast.success("All notifications marked as read"); refetch(); } });

  const unread = (notifications ?? []).filter(n => !n.isRead);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-['Poppins']">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">
            {unread.length > 0 ? `${unread.length} unread notification${unread.length > 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" className="gap-2" onClick={() => markAllReadMutation.mutate()}>
            <CheckCheck className="w-4 h-4" /> Mark All Read
          </Button>
        )}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-gray-400">Loading notifications...</div>
          ) : (notifications ?? []).length === 0 ? (
            <div className="p-16 text-center">
              <BellOff className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No notifications yet</p>
              <p className="text-gray-400 text-sm mt-1">You'll be notified here for KPI assignments, approvals, and alerts</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(notifications ?? []).map(n => {
                const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.INFO;
                return (
                  <div key={n.id}
                    className={cn("flex gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors", !n.isRead && "bg-blue-50/30")}
                    onClick={() => !n.isRead && markReadMutation.mutate({ id: n.id })}>
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg border", config.bg, config.border)}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm font-medium", !n.isRead ? "text-gray-900" : "text-gray-600")}>{n.title}</p>
                        {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {new Date(n.createdAt).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
