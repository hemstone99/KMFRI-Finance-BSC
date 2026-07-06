import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, Mail, User, ShieldCheck, AlertCircle, CheckCircle2, Settings } from "lucide-react";

export default function Setup() {
  const [form, setForm] = useState({
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
    employeeId: "",
  });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const initMutation = trpc.setup.initialize.useMutation({
    onSuccess: () => {
      setDone(true);
      setTimeout(() => { window.location.href = "/login"; }, 3000);
    },
    onError: (e) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.adminPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.adminPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    initMutation.mutate({
      adminName: form.adminName,
      adminEmail: form.adminEmail,
      adminPassword: form.adminPassword,
      employeeId: form.employeeId || undefined,
    });
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d2240 40%, #0a3d5c 70%, #0d5c7a 100%)" }}>
        <Card className="border-0 shadow-2xl bg-white/95 w-full max-w-md mx-4">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 font-['Poppins']">System Initialized!</h2>
            <p className="text-gray-500 text-sm mb-4">
              The KMFRI BSC system has been set up successfully. Roles, departments, and your ADFA account have been created.
            </p>
            <p className="text-blue-600 text-sm font-medium">Redirecting to sign in...</p>
            <Loader2 className="w-5 h-5 animate-spin text-blue-500 mx-auto mt-3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d2240 40%, #0a3d5c 70%, #0d5c7a 100%)" }}>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full border-2 border-white" />
          <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full border-2 border-white" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="flex justify-center mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <img
                src="/manus-storage/kmfri-logo-wide_02da27ab.png"
                alt="KMFRI Logo"
                className="h-16 w-auto object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 font-['Poppins']">System Setup</h1>
          <p className="text-blue-200 text-lg mb-2">Kenya Marine and Fisheries Research Institute</p>
          <p className="text-blue-300/70 text-sm mb-8">First-time configuration wizard</p>

          <div className="space-y-4 text-left">
            {[
              { step: "1", title: "Create ADFA Account", desc: "Set up the Assistant Director Finance & Accounts administrator" },
              { step: "2", title: "Roles & Departments Seeded", desc: "All 5 roles and default departments are created automatically" },
              { step: "3", title: "Start Managing KPIs", desc: "Log in and begin assigning KPIs to your team" },
            ].map(s => (
              <div key={s.step} className="flex gap-4 bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="w-8 h-8 rounded-full bg-blue-500/30 border border-blue-400/50 flex items-center justify-center shrink-0">
                  <span className="text-blue-200 text-sm font-bold">{s.step}</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{s.title}</p>
                  <p className="text-white/60 text-xs mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Setup Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <img src="/manus-storage/kmfri-logo-wide_02da27ab.png" alt="KMFRI" className="h-12 w-auto object-contain mx-auto mb-3" />
            <h1 className="text-white text-2xl font-bold font-['Poppins']">KMFRI BSC Setup</h1>
          </div>

          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 font-['Poppins']">Create ADFA Account</h2>
                  <p className="text-gray-500 text-xs mt-0.5">One-time system initialization</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={form.adminName}
                      onChange={e => setForm(p => ({ ...p, adminName: e.target.value }))}
                      placeholder="e.g., Dr. James Mwangi"
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="email"
                      value={form.adminEmail}
                      onChange={e => setForm(p => ({ ...p, adminEmail: e.target.value }))}
                      placeholder="adfa@kmfri.go.ke"
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Employee ID (optional)</Label>
                  <Input
                    value={form.employeeId}
                    onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
                    placeholder="KMFRI-001"
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="password"
                      value={form.adminPassword}
                      onChange={e => setForm(p => ({ ...p, adminPassword: e.target.value }))}
                      placeholder="Min. 6 characters"
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Confirm Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="password"
                      value={form.confirmPassword}
                      onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Re-enter password"
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="py-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold mt-2"
                  style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}
                  disabled={!form.adminName || !form.adminEmail || !form.adminPassword || initMutation.isPending}
                >
                  {initMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Initializing System...</>
                  ) : (
                    "Initialize System"
                  )}
                </Button>
              </form>

              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                  <p className="text-xs text-gray-400">
                    This setup runs once. After initialization, only the ADFA can create additional user accounts.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-white/40 text-xs mt-6">
            © {new Date().getFullYear()} Kenya Marine and Fisheries Research Institute
          </p>
        </div>
      </div>
    </div>
  );
}
