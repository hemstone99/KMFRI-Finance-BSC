import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Target, ClipboardList, Bell, AlertTriangle,
  Users, Building2, BarChart3, Settings, LogOut, Menu, X,
  ChevronRight, Bot, FileText, TrendingUp, Shield, BookOpen,
  ChevronDown, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles?: number[];
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "My KPIs", path: "/my-kpis", icon: Target, roles: [2, 3, 4, 5] },
  { label: "KPI Management", path: "/kpis", icon: ClipboardList, roles: [1] },
  { label: "Assignments", path: "/assignments", icon: FileText },
  { label: "Data Entry", path: "/data-entry", icon: Activity, roles: [4, 5] },
  { label: "Approvals", path: "/approvals", icon: Shield, roles: [1, 2, 3] },
  { label: "Anomaly Detection", path: "/anomalies", icon: AlertTriangle },
  { label: "Reports & Analytics", path: "/reports", icon: BarChart3 },
  { label: "Leave Management", path: "/leave", icon: FileText },
  { label: "Budget Tracking", path: "/budget", icon: TrendingUp, roles: [1] },
  { label: "Evidence Portal", path: "/evidence", icon: BookOpen },
  { label: "Export Reports", path: "/export", icon: BarChart3 },
  { label: "My Workspace", path: "/workspace", icon: LayoutDashboard, roles: [1] },
  { label: "Scorecard View", path: "/scorecard", icon: BarChart3 },
  { label: "Managers View", path: "/managers", icon: Users, roles: [1, 2, 3] },
  { label: "Bulk Import", path: "/bulk-import", icon: FileText, roles: [1] },
  { label: "YOY Comparison", path: "/yoy-comparison", icon: TrendingUp, roles: [1] },
  { label: "Strategic Goals", path: "/strategic-goals", icon: BookOpen, roles: [1] },
  { label: "User Management", path: "/users", icon: Users, roles: [1] },
  { label: "Departments", path: "/departments", icon: Building2, roles: [1] },
  { label: "Departments Mgmt", path: "/departments-management", icon: Building2, roles: [1] },
  { label: "Admin Dashboard", path: "/admin", icon: Settings, roles: [1] },
  { label: "AI Assistant", path: "/ai-assistant", icon: Bot },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Audit Logs", path: "/audit", icon: TrendingUp, roles: [1] },
];

interface KMFRILayoutProps {
  children: React.ReactNode;
  user: any;
}

export default function KMFRILayout({ children, user }: KMFRILayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/login"; },
  });

  const { data: notifCount, refetch: refetchCount } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  // Poll for notifications every 30s
  useEffect(() => {
    const interval = setInterval(() => refetchCount(), 30000);
    return () => clearInterval(interval);
  }, [refetchCount]);

  const roleId = user?.roleId ?? 3;
  const visibleNav = navItems.filter(item => !item.roles || item.roles.includes(roleId));
  const unread = notifCount?.count ?? 0;

  const getRoleBadge = () => {
    const roleName = user?.roleName ?? "Staff";
    const colors: Record<string, string> = {
      "ADFA": "bg-blue-900 text-blue-100",
      "Principal Accountant": "bg-emerald-900 text-emerald-100",
      "Senior Accountant": "bg-teal-900 text-teal-100",
      "Accountant": "bg-slate-700 text-slate-100",
      "Assistant Accountant": "bg-slate-600 text-slate-100",
    };
    return colors[roleName] ?? "bg-slate-700 text-slate-100";
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Header */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <img
              src="/manus-storage/kmfri-logo-seal_05061866.jpg"
              alt="KMFRI"
              className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <div className="text-white font-bold text-sm font-['Poppins'] truncate">KMFRI Finance</div>
              <div className="text-blue-300/70 text-xs truncate">Balanced Scorecard</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {visibleNav.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  onClick={() => setMobileSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 group relative",
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-blue-100/70 hover:bg-white/8 hover:text-white"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-400 rounded-r-full" />
                  )}
                  <Icon className={cn("shrink-0 transition-colors", sidebarOpen ? "w-4 h-4" : "w-5 h-5", isActive ? "text-blue-300" : "text-blue-300/50 group-hover:text-blue-300")} />
                  {sidebarOpen && (
                    <>
                      <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
                      {item.label === "Notifications" && unread > 0 && (
                        <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 h-5 min-w-5 flex items-center justify-center">
                          {unread > 99 ? "99+" : unread}
                        </Badge>
                      )}
                    </>
                  )}
                  {!sidebarOpen && item.label === "Notifications" && unread > 0 && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-white/10 space-y-2">
        <div className="px-3 py-2">
          <Badge className={getRoleBadge()}>{user?.roleName ?? "Staff"}</Badge>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col bg-gradient-to-b from-blue-950 to-blue-900 text-white border-r border-blue-800/50">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="md:hidden"
            >
              {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            {/* Logo & Title */}
            <div className="flex items-center gap-2">
              <img
                src="/manus-storage/kmfri-logo-seal_05061866.jpg"
                alt="KMFRI"
                className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div>
                <div className="text-sm font-bold text-gray-900">KMFRI Finance</div>
                <div className="text-xs text-gray-600">Balanced Scorecard</div>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Link href="/notifications">
              <Button size="icon" variant="ghost" className="relative">
                <Bell className="w-5 h-5 text-gray-600" />
                {unread > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 h-5 min-w-5 flex items-center justify-center">
                    {unread > 99 ? "99+" : unread}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">{user?.name}</span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium">{user?.name}</div>
                  <div className="text-xs text-gray-500">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  className="text-red-600 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Sidebar */}
        {mobileSidebarOpen && (
          <div className="md:hidden bg-gradient-to-b from-blue-950 to-blue-900 text-white border-b border-blue-800/50 max-h-96 overflow-y-auto">
            <SidebarContent />
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
