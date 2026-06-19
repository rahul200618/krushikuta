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

export const Route = createFileRoute("/ao/aao")({
  component: ExamPage,
  head: () => ({
    meta: [{ title: "AO/AAO — Krishikuta" }],
  }),
});

function ExamPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);
  const [deviceLockStatus, setDeviceLockStatus] = useState<'checking' | 'allowed' | 'locked'>('checking');

  // Each date releases all 3 subject papers simultaneously
  const RELEASE_DATES = [
    { set: 'Set 1',  date: '19/06/2026' },
    { set: 'Set 2',  date: '22/06/2026' },
    { set: 'Set 3',  date: '25/06/2026' },
    { set: 'Set 4',  date: '28/06/2026' },
    { set: 'Set 5',  date: '01/07/2026' },
    { set: 'Set 6',  date: '04/07/2026' },
    { set: 'Set 7',  date: '07/07/2026' },
    { set: 'Set 8',  date: '10/07/2026' },
    { set: 'Set 9',  date: '13/07/2026' },
    { set: 'Set 10', date: '16/07/2026' },
    { set: 'Set 11', date: '20/07/2026' },
    { set: 'Set 12', date: '23/07/2026' },
  ];

  const SUBJECTS = [
    { label: 'General',  releasedBg:'rgba(96,165,250,0.2)',  releasedBorder:'rgba(96,165,250,0.3)',  releasedColor:'#93c5fd' },
    { label: 'BSc Agri', releasedBg:'rgba(251,191,36,0.18)', releasedBorder:'rgba(251,191,36,0.25)', releasedColor:'#fcd34d' },
    { label: 'AgriMkt',  releasedBg:'rgba(167,139,250,0.18)',releasedBorder:'rgba(167,139,250,0.25)',releasedColor:'#c4b5fd' },
  ];

  const checkReleased = (dateStr: string) => {
    const [d, m, y] = dateStr.split('/').map(Number);
    const targetDate = new Date(y, m - 1, d);
    const today = new Date();
    return today >= targetDate;
  };

  const formatDateLabel = (dateStr: string) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [d, m, y] = dateStr.split('/').map(Number);
    return `${d} ${months[m - 1]} ${y}`;
  };

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
                          (res.profile.created_at && (Date.now() - new Date(res.profile.created_at).getTime() < 300000)); // 5 mins
        
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
    navigate({ to: '/ao/aao' as any });
  };

  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your portal...</p>
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
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position:'absolute', top:'-15%', left:'-10%', width:'60%', height:'60%', borderRadius:'50%', background:'radial-gradient(circle,rgba(52,211,153,0.18) 0%,transparent 70%)', filter:'blur(60px)' }} />
          <div style={{ position:'absolute', bottom:'-10%', right:'-8%', width:'65%', height:'55%', borderRadius:'50%', background:'radial-gradient(circle,rgba(16,185,129,0.12) 0%,transparent 70%)', filter:'blur(80px)' }} />
          <div style={{ position:'absolute', top:'40%', left:'50%', width:'40%', height:'40%', borderRadius:'50%', background:'radial-gradient(circle,rgba(134,239,172,0.08) 0%,transparent 70%)', filter:'blur(50px)', transform:'translateX(-50%)' }} />
        </div>

        {/* Floating 3D shapes */}
        <div className="absolute inset-0 pointer-events-none hidden md:block">
          <div style={{ position:'absolute', top:'10%', right:'5%', width:110, height:110, background:'linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.03))', border:'1px solid rgba(255,255,255,0.18)', borderRadius:28, transform:'rotate(20deg)', backdropFilter:'blur(10px)', boxShadow:'12px 24px 48px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.25)', animation:'f1 7s ease-in-out infinite' }} />
          <div style={{ position:'absolute', top:'52%', right:'3%', width:68, height:68, background:'linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.02))', border:'1px solid rgba(255,255,255,0.15)', borderRadius:18, transform:'rotate(-15deg)', backdropFilter:'blur(6px)', boxShadow:'8px 16px 32px rgba(0,0,0,0.35)', animation:'f2 9s ease-in-out infinite' }} />
          <div style={{ position:'absolute', top:'22%', left:'3%', width:80, height:80, background:'linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))', border:'1px solid rgba(255,255,255,0.12)', borderRadius:22, transform:'rotate(10deg)', backdropFilter:'blur(6px)', boxShadow:'6px 12px 28px rgba(0,0,0,0.3)', animation:'f3 8s ease-in-out infinite' }} />
          <div style={{ position:'absolute', bottom:'18%', left:'6%', width:48, height:48, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:'50%', boxShadow:'4px 8px 20px rgba(0,0,0,0.25)', animation:'f2 6s ease-in-out infinite' }} />
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ position:'absolute', top:`${14+i*16}%`, left:`${83+(i%2)*4}%`, width:4, height:4, borderRadius:'50%', background:'rgba(134,239,172,0.45)' }} />
          ))}
        </div>

        {/* Hero */}
        <div className="relative z-10 w-full flex flex-col items-center pt-14 md:pt-20 pb-14 px-4 text-center">

          {/* Badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:100, padding:'7px 18px', backdropFilter:'blur(10px)', marginBottom:32 }}>
            <Sparkles style={{ width:14, height:14, color:'#86efac' }} className="animate-pulse" />
            <span style={{ color:'rgba(255,255,255,0.85)', fontSize:12, fontWeight:600, letterSpacing:'0.04em' }}>
              AO / AAO Exam Prep 2026 · Karnataka's Most Comprehensive Series
            </span>
          </div>

          {/* Title */}
          <h1 style={{ fontSize:'clamp(2.4rem,7vw,5rem)', fontWeight:900, lineHeight:1.08, letterSpacing:'-0.03em', marginBottom:20, textShadow:'0 4px 30px rgba(0,0,0,0.5)' }}>
            <span style={{ color:'#ffffff', display:'block' }}>AO/AAO Exam</span>
            <span style={{ background:'linear-gradient(135deg,#86efac 0%,#34d399 50%,#10b981 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', display:'block' }}>
              Mock Test Series
            </span>
            <span style={{ color:'rgba(255,255,255,0.45)', display:'block', fontSize:'0.6em', fontWeight:700 }}>2026</span>
          </h1>

          <p style={{ color:'rgba(255,255,255,0.58)', fontSize:16, lineHeight:1.8, maxWidth:500, marginBottom:44 }}>
            High-fidelity mock papers, detailed analytics, and complete syllabus coverage by top agricultural specialists.
          </p>

          {/* Glowing CTA */}
          <Button
            onClick={() => navigate({ to: '/ao/aao/auth' as any })}
            className="group font-bold text-white rounded-full px-12 h-auto py-5 text-lg flex items-center gap-3 border-0"
            style={{ background:'linear-gradient(135deg,#059669 0%,#10b981 60%,#34d399 100%)', boxShadow:'0 8px 32px rgba(16,185,129,0.55),0 2px 8px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.25)', transition:'box-shadow 0.3s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(16,185,129,0.75),0 4px 16px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.3)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(16,185,129,0.55),0 2px 8px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.25)'}
          >
            <span>Start Free Mock Test</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {/* Release Schedule */}
        <div className="relative z-10 w-full max-w-3xl px-4">
          <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.11)', borderRadius:28, backdropFilter:'blur(20px)', padding:'2rem', boxShadow:'0 24px 60px rgba(0,0,0,0.35)' }}>

            {/* Schedule header */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <h3 style={{ color:'#ffffff', fontWeight:800, fontSize:17, display:'flex', alignItems:'center', gap:8, margin:0 }}>
                  <Calendar style={{ width:18, height:18, color:'#34d399' }} />
                  Papers Release Schedule
                </h3>
                <span style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.45)', fontSize:10, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', padding:'4px 12px', borderRadius:100 }}>
                  12 dates · 36 papers
                </span>
              </div>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12, fontWeight:500, marginBottom:10 }}>
                Each release date includes all 3 subject papers simultaneously:
              </p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {[
                  { label:'General Paper',       bg:'rgba(96,165,250,0.14)',  border:'rgba(96,165,250,0.28)',  color:'#93c5fd' },
                  { label:'BSc Agri (85%)',       bg:'rgba(251,191,36,0.12)', border:'rgba(251,191,36,0.25)', color:'#fcd34d' },
                  { label:'Agri Marketing (15%)', bg:'rgba(167,139,250,0.12)',border:'rgba(167,139,250,0.25)',color:'#c4b5fd' },
                ].map(s => (
                  <span key={s.label} style={{ background:s.bg, border:`1px solid ${s.border}`, color:s.color, fontSize:11, fontWeight:600, padding:'4px 12px', borderRadius:100 }}>
                    {s.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Date cards grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(136px,1fr))', gap:10 }}>
              {RELEASE_DATES.map((item) => {
                const isReleased = checkReleased(item.date);
                return (
                  <div
                    key={item.set}
                    style={{
                      background: isReleased
                        ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                        : 'rgba(255,255,255,0.92)',
                      border: isReleased ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(255,255,255,0.6)',
                      borderRadius:16, padding:'12px 14px',
                      display:'flex', flexDirection:'column', gap:8,
                      boxShadow: isReleased
                        ? '0 4px 20px rgba(16,185,129,0.18), 0 1px 4px rgba(0,0,0,0.06)'
                        : '0 4px 16px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)',
                      backdropFilter:'blur(12px)',
                      transition:'transform 0.2s, box-shadow 0.2s',
                      cursor:'default',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = isReleased
                        ? '0 8px 28px rgba(16,185,129,0.28), 0 2px 6px rgba(0,0,0,0.08)'
                        : '0 8px 24px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.07)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLElement).style.boxShadow = isReleased
                        ? '0 4px 20px rgba(16,185,129,0.18), 0 1px 4px rgba(0,0,0,0.06)'
                        : '0 4px 16px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)';
                    }}
                  >
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ color: isReleased ? '#15803d' : '#94a3b8', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{item.set}</span>
                      {isReleased
                        ? <CheckCircle2 style={{ width:14, height:14, color:'#34d399' }} />
                        : <Lock style={{ width:12, height:12, color:'#cbd5e1' }} />
                      }
                    </div>
                    <div style={{ color: isReleased ? '#166534' : '#334155', fontWeight:800, fontSize:13, letterSpacing:'-0.01em' }}>
                      {formatDateLabel(item.date)}
                    </div>
                    <div style={{ display:'flex', gap:3, flexWrap:'nowrap', overflow:'hidden' }}>
                      {SUBJECTS.map(s => (
                        <span key={s.label} style={{
                          fontSize:8, fontWeight:700, padding:'2px 5px', borderRadius:100, whiteSpace:'nowrap',
                          background: isReleased ? s.releasedBg  : 'rgba(100,116,139,0.1)',
                          border:     '1px solid ' + (isReleased ? s.releasedBorder : 'rgba(100,116,139,0.2)'),
                          color:      isReleased ? s.releasedColor : '#64748b',
                        }}>
                          {s.label}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, color: isReleased ? '#16a34a' : '#94a3b8' }}>
                      {isReleased ? '✓ Released' : '⏳ Coming Soon'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Keyframes */}
        <style>{`
          @keyframes f1{0%,100%{transform:rotate(20deg) translateY(0)}50%{transform:rotate(24deg) translateY(-14px)}}
          @keyframes f2{0%,100%{transform:rotate(-15deg) translateY(0)}50%{transform:rotate(-10deg) translateY(-10px)}}
          @keyframes f3{0%,100%{transform:rotate(10deg) translateY(0)}50%{transform:rotate(6deg) translateY(-8px)}}
        `}</style>
      </div>
    );
  }

  if (session && deviceLockStatus === 'needs_registration') {
    return (
      <div className="min-h-screen bg-[#071a0e] flex flex-col items-center justify-center p-4" style={{ fontFamily:"'Inter',sans-serif" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position:'absolute', top:'10%', left:'10%', width:'50%', height:'50%', borderRadius:'50%', background:'radial-gradient(circle,rgba(52,211,153,0.08) 0%,transparent 70%)', filter:'blur(60px)' }} />
          <div style={{ position:'absolute', bottom:'10%', right:'10%', width:'50%', height:'50%', borderRadius:'50%', background:'radial-gradient(circle,rgba(16,185,129,0.05) 0%,transparent 70%)', filter:'blur(80px)' }} />
        </div>
        
        <div className="w-full max-w-md bg-white border border-[#e0e8e2] p-8 rounded-3xl shadow-2xl relative z-10 text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 bg-[#eaf2eb] rounded-2xl flex items-center justify-center text-[#2c5f34] mx-auto shadow-[0_4px_20px_rgba(44,95,52,0.15)] animate-bounce">
            <Lock className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">Register Primary Device</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              To enforce exam integrity and secure your account, you must register this device/browser as your primary login device.
            </p>
          </div>
          
          <div className="p-4 bg-[#f4f7f4] border border-[#e0e8e2] rounded-2xl text-left space-y-2.5 text-xs text-slate-600">
            <div className="font-semibold text-[#1a3820] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2c5f34] shrink-0" /> Device Lock Protection
            </div>
            <p className="leading-relaxed">
              Once registered, you can only access the mock test dashboard from this browser on this device. For changes, you will need to ask the admin.
            </p>
            {userProfile && (
              <div className="pt-2 border-t border-[#e0e8e2] space-y-1 text-slate-500">
                <div>Name: <span className="font-semibold text-[#1a3820]">{String(userProfile.name)}</span></div>
                <div>Email: <span className="font-semibold text-[#1a3820]">{String(userProfile.email)}</span></div>
                <div>Mobile: <span className="font-semibold text-[#1a3820]">{String(userProfile.mobile)}</span></div>
              </div>
            )}
          </div>
          
          <div className="space-y-3 pt-2">
            <Button 
              onClick={handleRegisterDevice}
              className="w-full py-5 rounded-2xl bg-[#2c5f34] hover:bg-[#1a3820] text-white font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(44,95,52,0.25)] transition-all"
            >
              <CheckCircle2 className="w-4 h-4" /> Register This Device
            </Button>
            <Button 
              onClick={async () => {
                await supabase.auth.signOut();
              }}
              variant="outline" 
              className="w-full py-5 rounded-2xl border-slate-200 text-slate-700 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (session && deviceLockStatus === 'locked') {
    return (
      <div className="min-h-screen bg-[#071a0e] flex flex-col items-center justify-center p-4" style={{ fontFamily:"'Inter',sans-serif" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position:'absolute', top:'10%', left:'10%', width:'50%', height:'50%', borderRadius:'50%', background:'radial-gradient(circle,rgba(239,68,68,0.08) 0%,transparent 70%)', filter:'blur(60px)' }} />
          <div style={{ position:'absolute', bottom:'10%', right:'10%', width:'50%', height:'50%', borderRadius:'50%', background:'radial-gradient(circle,rgba(239,68,68,0.05) 0%,transparent 70%)', filter:'blur(80px)' }} />
        </div>
        
        <div className="w-full max-w-md bg-white border border-red-100 p-8 rounded-3xl shadow-2xl relative z-10 text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto shadow-[0_4px_20px_rgba(239,68,68,0.15)] animate-pulse">
            <Lock className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">Account Device Locked</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              To enforce exam integrity and prevent account sharing, your account is locked to your primary registered device.
            </p>
          </div>
          
          <div className="p-4 bg-red-50/50 border border-red-100/50 rounded-2xl text-left space-y-2.5 text-xs text-slate-600">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" /> Need to login from a new device?
            </div>
            <p className="leading-relaxed">
              If you have purchased a new phone, switched browsers, or cleared your browser data, please contact the **Krushikuta Administrator** to request a registered device reset.
            </p>
            {userProfile && (
              <div className="pt-2 border-t border-red-100/50 space-y-1 text-slate-500">
                <div>Name: <span className="font-semibold text-slate-700">{String(userProfile.name)}</span></div>
                <div>Email: <span className="font-semibold text-slate-700">{String(userProfile.email)}</span></div>
                <div>Mobile: <span className="font-semibold text-slate-700">{String(userProfile.mobile)}</span></div>
              </div>
            )}
          </div>
          
          <div className="pt-2">
            <Button 
              onClick={async () => {
                await supabase.auth.signOut();
              }}
              variant="outline" 
              className="w-full py-5 rounded-2xl border-slate-200 text-slate-700 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500" /> Sign Out from Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     LOGGED-IN DASHBOARD
  ───────────────────────────────────────────── */
  return (
    <div className="bg-background min-h-screen pb-12 pt-8">
      <div className="container-px mx-auto max-w-6xl">
        <ExamAuthModal open={showAuthModal} onOpenChange={setShowAuthModal} onSuccess={handleAuthSuccess} />
        <ExamDashboard
          userId={session?.user?.id}
          userEmail={session?.user?.email || (userProfile?.email as string)}
          userProfile={userProfile}
          onRequireAuth={() => setShowAuthModal(true)}
        />
      </div>
    </div>
  );
}
