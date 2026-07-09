import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, Mail, ShieldCheck, AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => { window.location.href = "/"; },
    onError: (err) => { setError(err.message); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter your email and password."); return; }
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d2240 40%, #0a3d5c 70%, #0d5c7a 100%)" }}>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full border-2 border-white" />
          <div className="absolute top-20 left-20 w-48 h-48 rounded-full border border-white" />
          <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full border-2 border-white" />
          <div className="absolute bottom-10 right-20 w-56 h-56 rounded-full border border-white" />
        </div>

        <div className="relative z-10 text-center max-w-md">
          {/* KMFRI Logo */}
          <div className="flex justify-center mb-8">
            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 backdrop-blur-xl shadow-2xl">
              <img
                src="/logo.jpg"
                alt="KMFRI Logo"
                className="h-14 max-w-[180px] w-auto object-contain"
              />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-3 font-['Poppins']">
            Finance BSC System
          </h1>
          <p className="text-blue-200 text-lg mb-2">Kenya Marine and Fisheries Research Institute</p>
          <p className="text-blue-300/70 text-sm">Balanced Scorecard Performance Management</p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: "KPI Tracking", icon: "📊" },
              { label: "Real-time Alerts", icon: "🔔" },
              { label: "AI Insights", icon: "🤖" },
            ].map((f) => (
              <div key={f.label} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="text-white/80 text-xs font-medium">{f.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-3 bg-white/5 rounded-xl p-4 border border-white/10">
            <ShieldCheck className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-white/70 text-xs text-left">
              Secure government-grade system. Access is restricted to authorized KMFRI Finance Department personnel only.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img
              src="/logo.jpg"
              alt="KMFRI"
              className="h-10 max-w-[160px] w-auto object-contain mx-auto mb-3"
            />
            <h1 className="text-white text-2xl font-bold font-['Poppins']">KMFRI Finance BSC</h1>
          </div>

          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-gray-900 font-['Poppins']">Sign In</h2>
                <p className="text-gray-500 text-sm mt-1">Enter your credentials to access the system</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-4 shadow-sm">
                  <div className="mb-4 text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Secure sign in</p>
                    <h2 className="text-xl font-semibold text-gray-900">Welcome back</h2>
                    <p className="text-sm text-slate-500">Continue to your KMFRI finance dashboard</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.name@kmfri.go.ke"
                      className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      autoComplete="current-password"
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
                  className="w-full h-12 text-sm font-semibold tracking-wide"
                  style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                  ) : (
                    "Sign In to System"
                  )}
                </Button>
              </form>

              <div className="mt-6 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4 text-center text-sm text-slate-500">
                Need help signing in? Contact your system administrator for access.
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
