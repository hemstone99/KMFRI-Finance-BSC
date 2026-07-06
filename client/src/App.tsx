import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import KMFRILayout from "./components/KMFRILayout";
import { Loader2 } from "lucide-react";

// Pages
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import KPIManagement from "./pages/KPIManagement";
import MyKPIs from "./pages/MyKPIs";
import Assignments from "./pages/Assignments";
import DataEntry from "./pages/DataEntry";
import Approvals from "./pages/Approvals";
import Anomalies from "./pages/Anomalies";
import Reports from "./pages/Reports";
import StrategicGoals from "./pages/StrategicGoals";
import UserManagement from "./pages/UserManagement";
import Departments from "./pages/Departments";
import AIAssistant from "./pages/AIAssistant";
import Notifications from "./pages/Notifications";
import AuditLogs from "./pages/AuditLogs";
import LeaveManagement from "./pages/LeaveManagement";
import BudgetTracking from "./pages/BudgetTracking";
import EvidencePortal from "./pages/EvidencePortal";
import ExportReports from "./pages/ExportReports";
import MyWorkspace from "./pages/MyWorkspace";
import ScorecardView from "./pages/ScorecardView";
import ManagersView from "./pages/ManagersView";
import BulkImport from "./pages/BulkImport";
import YOYComparison from "./pages/YOYComparison";
import AdminDashboard from "./pages/AdminDashboard";
import DepartmentsManagement from "./pages/DepartmentsManagement";
import NotFound from "./pages/NotFound";

/** Checks setup status — only redirects to /setup if truly uninitialized (no roles at all) and user is not logged in */
function SetupGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();
  const { data: status, isLoading } = trpc.setup.status.useQuery(undefined, {
    staleTime: 60_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a1628, #0d2240)" }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-3" />
          <p className="text-sm text-blue-200/60">Checking system status...</p>
        </div>
      </div>
    );
  }

  // Only redirect to /setup if roles are NOT seeded at all (truly fresh install)
  // If roles are seeded but no ADFA, authenticated users see the Claim ADFA banner instead
  const needsSetup = status && !status.rolesSeeded;
  if (needsSetup && !user && location !== "/setup" && location !== "/login") {
    return <Redirect to="/setup" />;
  }

  // If fully initialized and on /setup, redirect to login
  if (status?.initialized && location === "/setup") {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading KMFRI BSC...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  return <KMFRILayout user={user}>{children}</KMFRILayout>;
}

function Router() {
  return (
    <SetupGuard>
      <Switch>
        <Route path="/setup" component={Setup} />
        <Route path="/login" component={Login} />
        <Route path="/">
          {() => <AuthGuard><Dashboard /></AuthGuard>}
        </Route>
        <Route path="/my-kpis">
          {() => <AuthGuard><MyKPIs /></AuthGuard>}
        </Route>
        <Route path="/kpis">
          {() => <AuthGuard><KPIManagement /></AuthGuard>}
        </Route>
        <Route path="/assignments">
          {() => <AuthGuard><Assignments /></AuthGuard>}
        </Route>
        <Route path="/data-entry">
          {() => <AuthGuard><DataEntry /></AuthGuard>}
        </Route>
        <Route path="/approvals">
          {() => <AuthGuard><Approvals /></AuthGuard>}
        </Route>
        <Route path="/anomalies">
          {() => <AuthGuard><Anomalies /></AuthGuard>}
        </Route>
        <Route path="/reports">
          {() => <AuthGuard><Reports /></AuthGuard>}
        </Route>
        <Route path="/strategic-goals">
          {() => <AuthGuard><StrategicGoals /></AuthGuard>}
        </Route>
        <Route path="/users">
          {() => <AuthGuard><UserManagement /></AuthGuard>}
        </Route>
        <Route path="/departments">
          {() => <AuthGuard><Departments /></AuthGuard>}
        </Route>
        <Route path="/ai-assistant">
          {() => <AuthGuard><AIAssistant /></AuthGuard>}
        </Route>
        <Route path="/notifications">
          {() => <AuthGuard><Notifications /></AuthGuard>}
        </Route>
        <Route path="/audit">
          {() => <AuthGuard><AuditLogs /></AuthGuard>}
        </Route>
        <Route path="/leave">
          {() => <AuthGuard><LeaveManagement /></AuthGuard>}
        </Route>
        <Route path="/budget">
          {() => <AuthGuard><BudgetTracking /></AuthGuard>}
        </Route>
        <Route path="/evidence">
          {() => <AuthGuard><EvidencePortal /></AuthGuard>}
        </Route>
        <Route path="/export">
          {() => <AuthGuard><ExportReports /></AuthGuard>}
        </Route>
        <Route path="/workspace">
          {() => <AuthGuard><MyWorkspace /></AuthGuard>}
        </Route>
        <Route path="/scorecard">
          {() => <AuthGuard><ScorecardView /></AuthGuard>}
        </Route>
        <Route path="/managers">
          {() => <AuthGuard><ManagersView /></AuthGuard>}
        </Route>
        <Route path="/bulk-import">
          {() => <AuthGuard><BulkImport /></AuthGuard>}
        </Route>
        <Route path="/yoy-comparison">
          {() => <AuthGuard><YOYComparison /></AuthGuard>}
        </Route>
        <Route path="/admin">
          {() => <AuthGuard><AdminDashboard /></AuthGuard>}
        </Route>
        <Route path="/departments-management">
          {() => <AuthGuard><DepartmentsManagement /></AuthGuard>}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </SetupGuard>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
