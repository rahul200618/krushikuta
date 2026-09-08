import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ExamDashboard } from "@/components/exam/ExamDashboard";
import { ExamAuthModal } from "@/components/exam/ExamAuthModal";
import { getProfile } from "@/lib/exam-api";
import { Loader2, Calendar, Lock, CheckCircle2, Sparkles, ArrowRight, ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyDeviceLock } from "@/lib/device-lock";
import { toast } from "sonner";

export const Route = createFileRoute("/exam-dashboard")({
  component: ExamDashboardPage,
  head: () => ({
    meta: [{ title: "Exam Dashboard — Krishikuta" }],
  }),
});

function ExamDashboardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);
  const [deviceLockStatus, setDeviceLockStatus] = useState<'checking' | 'allowed' | 'locked' | 'needs_registration'>('checking');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) fetchProfile(data.session.user.id);
      else { setLoadingAuth(false); setDeviceLockStatus('allowed'); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else { setUserProfile(null); setDeviceLockStatus('allowed'); setLoadingAuth(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const res = await getProfile(uid);
      setUserProfile(res.profile);
      if (res.profile) {
        const isNewUser = sessionStorage.getItem('krushikuta_is_new_user') === 'true' ||
                          (res.profile.created_at && (Date.now() - new Date(res.profile.created_at).getTime() < 300000));
        
        sessionStorage.removeItem('krushikuta_is_new_user');

        const lockRes = await verifyDeviceLock(uid, res.profile, isNewUser);
        if (lockRes.needsRegistration) {
          setDeviceLockStatus('needs_registration');
        } else if (lockRes.locked) {
          setDeviceLockStatus('locked');
        } else {
          setDeviceLockStatus('allowed');
        }
      } else {
        setDeviceLockStatus('allowed');
      }
    } catch {
      setDeviceLockStatus('allowed');
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleRegisterDevice = async () => {
    if (!session || !userProfile) return;
    setLoadingAuth(true);
    try {
      const uid = session.user.id;
      const { registerDevice } = await import("@/lib/device-lock");
      const lockRes = await registerDevice(uid, userProfile);
      if (lockRes.allowed) {
        setDeviceLockStatus('allowed');
        toast.success("Device registered successfully! This is now your primary device.");
      } else {
        toast.error("Failed to register device");
      }
    } catch (err: any) {
      toast.error(err.message || "Error registering device");
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    navigate({ to: '/exam-dashboard' as any });
  };

  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your exam dashboard...</p>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     GUEST LANDING PAGE (not logged in)
  ───────────────────────────────────────────── */
  if (!session) {
    return (
      <div
        className="min-h-screen relative overflow-hidden flex flex-col items-center pb-20"
        style={{ background:'linear-gradient(160deg,#071a0e 0%,#0a2e17 30%,#0d4a25 60%,#0e5c30 100%)', fontFamily:"'Inter',sans-serif" }}
      >
        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto px-4 pt-16 md:pt-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs md:text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Agriculture & Allied Govt Exams Portal</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
            Krishikuta Online <br />
            <span className="bg-gradient-to-r from-emerald-300 via-green-200 to-teal-100 bg-clip-text text-transparent">
              Exam Dashboard
            </span>
          </h1>

          <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed mb-8">
            Access free mock tests, timed CBT test environments, and comprehensive exam preparation papers. Sign in or create an account to start!
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              onClick={() => setShowAuthModal(true)}
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-8 py-6 rounded-2xl text-base shadow-[0_10px_30px_rgba(16,185,129,0.4)]"
            >
              Log In / Sign Up to Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>

        <ExamAuthModal
          open={showAuthModal}
          onOpenChange={setShowAuthModal}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     DEVICE LOCK SCREEN
  ───────────────────────────────────────────── */
  if (deviceLockStatus === 'locked') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-destructive/20 text-center shadow-xl">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Locked</h2>
          <p className="text-muted-foreground text-sm mb-6">
            This account is registered to another primary device. Please use your registered device or contact support.
          </p>
          <Button onClick={() => supabase.auth.signOut()} variant="outline" className="w-full">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (deviceLockStatus === 'needs_registration') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-border text-center shadow-xl">
          <h2 className="text-2xl font-bold mb-2">Register This Device</h2>
          <p className="text-muted-foreground text-sm mb-6">
            To secure your account, please register this device as your primary exam device.
          </p>
          <Button onClick={handleRegisterDevice} className="w-full gradient-primary">
            Register This Device
          </Button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     LOGGED IN STUDENT DASHBOARD
  ───────────────────────────────────────────── */
  return (
    <div className="container-px mx-auto max-w-7xl py-5 md:py-8">
      <ExamDashboard
        userId={session.user.id}
        userEmail={session.user.email}
        userProfile={userProfile}
        onRequireAuth={() => setShowAuthModal(true)}
      />

      <ExamAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
}
