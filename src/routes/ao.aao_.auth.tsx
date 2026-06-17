import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { checkMobile, saveProfile } from '@/lib/exam-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Smartphone, KeyRound, User, Mail, GraduationCap, MapPin,
  ChevronLeft, Loader2, CheckCircle2, ArrowRight, Sparkles, Award
} from 'lucide-react';
import { toast } from 'sonner';
import logoImage from '@/assets/transparent-image.png';

export const Route = createFileRoute('/ao/aao_/auth')({
  component: AuthPage,
  head: () => ({
    meta: [{ title: 'Login — AO/AAO | Krishikuta' }],
  }),
});

type Step = 'mobile' | 'password' | 'profile';

function AuthPage() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('mobile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [mobile, setMobile]   = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [degree, setDegree]   = useState('');
  const [district, setDistrict] = useState('');
  const [college, setCollege]   = useState('');
  const [existingEmail, setExistingEmail] = useState<string | null>(null);
  const [existingName,  setExistingName]  = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: '/ao/aao' as any });
    });
  }, []);

  // ── Handlers ───────────────────────────────────────────────
  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await checkMobile(mobile);
      if (res.exists && res.email) {
        setExistingEmail(res.email);
        setExistingName(res.name || 'Student');
        setStep('password');
      } else {
        setEmail(''); setName('');
        setStep('profile');
      }
    } catch (err: any) {
      setError(err.message || 'Error checking mobile number.');
    } finally { setLoading(false); }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError('Please enter your password.'); return; }
    setLoading(true); setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: existingEmail!, password });
      if (authError) { setError(authError.message); return; }
      toast.success('Successfully logged in!');
      navigate({ to: '/ao/aao' as any });
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally { setLoading(false); }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword || !degree) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true); setError('');
    try {
      let data: any = null;
      let signUpError: any = null;

      try {
        const res = await supabase.auth.signUp({ email, password });
        data = res.data;
        signUpError = res.error;
      } catch (err: any) {
        signUpError = err;
      }

      let uid = data?.user?.id;

      if (signUpError) {
        const errMsg = signUpError.message || '';
        const isAlreadyRegistered = errMsg.toLowerCase().includes('already') || 
                                    errMsg.toLowerCase().includes('exists') ||
                                    signUpError.status === 400;

        if (isAlreadyRegistered) {
          // Attempt to sign in with the provided password
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            setError('This email is already registered. Please enter the correct password for this account.');
            setLoading(false);
            return;
          }
          uid = signInData.user?.id;
        } else {
          setError(signUpError.message || 'Signup failed.');
          setLoading(false);
          return;
        }
      }

      if (uid) {
        // Try direct client upsert first as authenticated user
        const { error: profileError } = await supabase
          .from('student_profiles')
          .upsert({
            firebase_uid: uid,
            name,
            email,
            mobile,
            district,
            college,
            category: degree, // Store degree under the category column
            updated_at: new Date().toISOString()
          }, { onConflict: 'firebase_uid' });

        if (profileError) {
          console.warn('Direct client-side profile upsert failed, falling back to API:', profileError);
          await saveProfile(uid, {
            name,
            email,
            mobile,
            district,
            college,
            category: degree // Store degree under the category column
          });
        }
      }
      toast.success('Successfully logged in and profile saved! Welcome to Krishikuta 🎉');
      navigate({ to: '/ao/aao' as any });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const handleBack = () => {
    setError('');
    setStep('mobile');
    setPassword('');
    setConfirmPassword('');
  };

  // ── PROFILE CREATION — full screen ────────────────────────
  if (step === 'profile') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #f8fffe 0%, #f0fdf7 50%, #ecfdf5 100%)', fontFamily: "'Inter', sans-serif" }}
      >
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position:'absolute', top:'-10%', left:'-5%', width:'55%', height:'55%', borderRadius:'50%', background:'radial-gradient(circle,rgba(16,185,129,0.08) 0%,transparent 70%)', filter:'blur(60px)' }} />
          <div style={{ position:'absolute', bottom:'-10%', right:'-5%', width:'60%', height:'60%', borderRadius:'50%', background:'radial-gradient(circle,rgba(20,184,166,0.06) 0%,transparent 70%)', filter:'blur(80px)' }} />
        </div>
        {/* Floating shapes */}
        <div className="absolute inset-0 pointer-events-none hidden md:block">
          <div style={{ position:'absolute', top:'8%', right:'4%', width:90, height:90, background:'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.02))', border:'1px solid rgba(16,185,129,0.15)', borderRadius:24, transform:'rotate(18deg)', backdropFilter:'blur(8px)', boxShadow:'4px 12px 30px rgba(16,120,80,0.08)', animation:'f1 7s ease-in-out infinite' }} />
          <div style={{ position:'absolute', bottom:'10%', left:'4%', width:64, height:64, background:'linear-gradient(135deg,rgba(16,185,129,0.06),rgba(16,185,129,0.01))', border:'1px solid rgba(16,185,129,0.12)', borderRadius:18, transform:'rotate(-10deg)', backdropFilter:'blur(6px)', boxShadow:'3px 8px 20px rgba(16,120,80,0.06)', animation:'f3 8s ease-in-out infinite' }} />
        </div>

        <div className="relative z-10 w-full max-w-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={logoImage} alt="Krishikuta" style={{ height:50, width:'auto', objectFit:'contain', opacity:0.95 }} />
          </div>

          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'1px solid rgba(22,163,74,0.2)', borderRadius:100, padding:'6px 16px' }}>
              <Sparkles style={{ width:13, height:13, color:'#16a34a' }} className="animate-pulse" />
              <span style={{ color:'#15803d', fontSize:11, fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase' }}>
                New Account · AO/AAO Exam 2026
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 style={{ color:'#0f172a', fontSize:'clamp(1.8rem,4vw,2.5rem)', fontWeight:900, letterSpacing:'-0.03em', marginBottom:8 }}>
              Create Your <span style={{ background:'linear-gradient(135deg,#059669,#10b981)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Profile</span>
            </h1>
            <p style={{ color:'#64748b', fontSize:14, lineHeight:1.6 }}>
              Mobile: <strong style={{ color:'#0e5c30' }}>+91 {mobile}</strong> · Fill in your details to get started
            </p>
          </div>

          {/* Profile card */}
          <div style={{ background:'rgba(255,255,255,0.85)', backdropFilter:'blur(24px)', border:'1px solid rgba(16,185,129,0.12)', borderRadius:28, padding:'2.5rem', boxShadow:'0 32px 80px -12px rgba(16,120,80,0.15),0 4px 16px rgba(0,0,0,0.05),inset 0 1px 0 rgba(255,255,255,0.9)' }}>

            {/* Back button */}
            <button onClick={handleBack}
              style={{ display:'flex', alignItems:'center', gap:4, color:'#64748b', fontSize:13, fontWeight:600, background:'none', border:'none', cursor:'pointer', marginBottom:20, padding:0 }}
            >
              <ChevronLeft style={{ width:16, height:16 }} /> Back
            </button>

            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'10px 14px', color:'#dc2626', fontSize:13, fontWeight:500, marginBottom:20 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Full Name */}
                <div>
                  <label style={{ color:'#475569', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>Full Name *</label>
                  <div className="relative">
                    <input
                      value={name} onChange={e => setName(e.target.value)}
                      placeholder="Your full name" required disabled={loading} autoFocus
                      style={{ width:'100%', background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 40px 12px 14px', color:'#0f172a', fontSize:14, fontWeight:500, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor = '#10b981')}
                      onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    />
                    <User style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'#94a3b8' }} />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label style={{ color:'#475569', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>Email Address *</label>
                  <div className="relative">
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" required disabled={loading}
                      style={{ width:'100%', background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 40px 12px 14px', color:'#0f172a', fontSize:14, fontWeight:500, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor = '#10b981')}
                      onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    />
                    <Mail style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'#94a3b8' }} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={{ color:'#475569', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>Password *</label>
                  <div className="relative">
                    <input
                      type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 6 characters" required disabled={loading}
                      style={{ width:'100%', background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 40px 12px 14px', color:'#0f172a', fontSize:14, fontWeight:500, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor = '#10b981')}
                      onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    />
                    <KeyRound style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'#94a3b8' }} />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={{ color:'#475569', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>Confirm Password *</label>
                  <div className="relative">
                    <input
                      type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password" required disabled={loading}
                      style={{ width:'100%', background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 40px 12px 14px', color:'#0f172a', fontSize:14, fontWeight:500, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor = '#10b981')}
                      onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    />
                    <KeyRound style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'#94a3b8' }} />
                  </div>
                </div>

                {/* Mobile (locked) */}
                <div>
                  <label style={{ color:'#475569', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>Mobile</label>
                  <div className="relative">
                    <input
                      value={`+91 ${mobile}`} disabled
                      style={{ width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 40px 12px 14px', color:'#94a3b8', fontSize:14, fontWeight:600, outline:'none', boxSizing:'border-box', cursor:'not-allowed' }}
                    />
                    <Smartphone style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'#cbd5e1' }} />
                  </div>
                </div>

                {/* Degree */}
                <div>
                  <label style={{ color:'#475569', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>Degree / Course *</label>
                  <div className="relative">
                    <input
                      value={degree} onChange={e => setDegree(e.target.value)}
                      placeholder="e.g. B.Sc. Agriculture" required disabled={loading}
                      style={{ width:'100%', background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 40px 12px 14px', color:'#0f172a', fontSize:14, fontWeight:500, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor = '#10b981')}
                      onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    />
                    <Award style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'#94a3b8' }} />
                  </div>
                </div>

                {/* District */}
                <div>
                  <label style={{ color:'#475569', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>District</label>
                  <div className="relative">
                    <input
                      value={district} onChange={e => setDistrict(e.target.value)}
                      placeholder="Your district" disabled={loading}
                      style={{ width:'100%', background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 40px 12px 14px', color:'#0f172a', fontSize:14, fontWeight:500, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor = '#10b981')}
                      onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    />
                    <MapPin style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'#94a3b8' }} />
                  </div>
                </div>

                {/* College */}
                <div>
                  <label style={{ color:'#475569', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>College / Institution</label>
                  <div className="relative">
                    <input
                      value={college} onChange={e => setCollege(e.target.value)}
                      placeholder="College name" disabled={loading}
                      style={{ width:'100%', background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 40px 12px 14px', color:'#0f172a', fontSize:14, fontWeight:500, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor = '#10b981')}
                      onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    />
                    <GraduationCap style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'#94a3b8' }} />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-8">
                <button
                  type="button" onClick={handleBack} disabled={loading}
                  style={{ display:'flex', alignItems:'center', gap:6, color:'#64748b', fontSize:13, fontWeight:600, background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 18px', cursor:'pointer', transition:'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0f172a'; (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}
                >
                  <ChevronLeft style={{ width:16, height:16 }} /> Back
                </button>
                <button
                  type="submit" disabled={loading}
                  style={{ flex:1, background:'linear-gradient(135deg,#059669 0%,#10b981 60%,#34d399 100%)', border:'none', borderRadius:12, padding:'14px', color:'#ffffff', fontSize:15, fontWeight:800, cursor:loading ? 'not-allowed' : 'pointer', boxShadow:'0 8px 24px rgba(16,185,129,0.45)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'box-shadow 0.3s', opacity: loading ? 0.75 : 1 }}
                  onMouseEnter={e => !loading && ((e.currentTarget as HTMLElement).style.boxShadow = '0 12px 36px rgba(16,185,129,0.65)')}
                  onMouseLeave={e => !loading && ((e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(16,185,129,0.45)')}
                >
                  {loading ? <Loader2 style={{ width:20, height:20, animation:'spin 1s linear infinite' }} /> : <><span>Create Account & Start</span><ArrowRight style={{ width:18, height:18 }} /></>}
                </button>
              </div>
            </form>
          </div>

          <p style={{ textAlign:'center', fontSize:11, color:'#94a3b8', marginTop:20, fontWeight:500 }}>
            By continuing, you agree to Krishikuta's{' '}
            <span style={{ color:'#0e5c30', fontWeight:600 }}>Terms of Service</span>{' '}&amp;{' '}
            <span style={{ color:'#0e5c30', fontWeight:600 }}>Privacy Policy</span>.
          </p>
        </div>

        <style>{`
          @keyframes f1{0%,100%{transform:rotate(18deg) translateY(0)}50%{transform:rotate(22deg) translateY(-12px)}}
          @keyframes f3{0%,100%{transform:rotate(-10deg) translateY(0)}50%{transform:rotate(-6deg) translateY(-8px)}}
          @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          input::placeholder{color:#94a3b8;}
        `}</style>
      </div>
    );
  }

  // ── SPLIT LAYOUT — mobile + password steps ─────────────────
  return (
    <div className="min-h-screen flex overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0a3d1f 0%,#0e5c30 40%,#1a8a4a 75%,#22c55e 100%)' }}
      >
        {/* Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position:'absolute', top:'-8%', left:'-8%', width:'55%', height:'55%', borderRadius:'50%', background:'radial-gradient(circle,rgba(134,239,172,0.25) 0%,transparent 70%)', filter:'blur(40px)' }} />
          <div style={{ position:'absolute', bottom:'-12%', right:'-5%', width:'65%', height:'65%', borderRadius:'50%', background:'radial-gradient(circle,rgba(16,185,129,0.2) 0%,transparent 70%)', filter:'blur(60px)' }} />
          <div style={{ position:'absolute', top:'35%', right:'10%', width:'35%', height:'35%', borderRadius:'50%', background:'radial-gradient(circle,rgba(52,211,153,0.15) 0%,transparent 70%)', filter:'blur(30px)' }} />
        </div>
        {/* Floating shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{ position:'absolute', top:'18%', right:'8%', width:120, height:120, background:'linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04))', border:'1px solid rgba(255,255,255,0.2)', borderRadius:24, transform:'rotate(18deg)', backdropFilter:'blur(8px)', boxShadow:'8px 16px 40px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.3)', animation:'float1 6s ease-in-out infinite' }} />
          <div style={{ position:'absolute', top:'60%', right:'20%', width:64, height:64, background:'linear-gradient(135deg,rgba(255,255,255,0.22),rgba(255,255,255,0.06))', border:'1px solid rgba(255,255,255,0.25)', borderRadius:16, transform:'rotate(-12deg)', backdropFilter:'blur(6px)', boxShadow:'4px 8px 24px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.3)', animation:'float2 8s ease-in-out infinite' }} />
          <div style={{ position:'absolute', bottom:'15%', left:'5%', width:80, height:80, background:'linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))', border:'1px solid rgba(255,255,255,0.15)', borderRadius:20, transform:'rotate(8deg)', backdropFilter:'blur(4px)', boxShadow:'4px 8px 20px rgba(0,0,0,0.2)', animation:'float3 7s ease-in-out infinite' }} />
          <div style={{ position:'absolute', top:'10%', left:'45%', width:32, height:32, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'50%', boxShadow:'0 4px 16px rgba(0,0,0,0.2)', animation:'float2 5s ease-in-out infinite' }} />
        </div>

        {/* Brand logo */}
        <div className="relative z-10">
          <img src={logoImage} alt="Krishikuta" style={{ height:56, width:'auto', objectFit:'contain', filter:'brightness(0) invert(1)', opacity:0.92 }} />
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:100, padding:'6px 16px', backdropFilter:'blur(8px)' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#86efac', animation:'pulse 2s infinite' }} />
            <span style={{ color:'rgba(255,255,255,0.85)', fontSize:12, fontWeight:600, letterSpacing:'0.04em' }}>AO / AAO Exam 2026</span>
          </div>
          <h1 style={{ color:'#ffffff', fontSize:'clamp(2rem,3.5vw,2.75rem)', fontWeight:900, lineHeight:1.12, letterSpacing:'-0.03em' }}>
            Karnataka's Most<br />
            <span style={{ color:'#86efac' }}>Comprehensive</span><br />
            Mock Test Series
          </h1>
          <p style={{ color:'rgba(255,255,255,0.65)', fontSize:15, lineHeight:1.7, maxWidth:400 }}>
            High-fidelity practice papers crafted by top agricultural specialists.
            Track your progress, identify weak areas, and crack the AO/AAO exam.
          </p>
        </div>

        <div className="relative z-10">
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:12, fontWeight:500 }}>© 2026 Krishikuta · All rights reserved</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 relative overflow-hidden"
        style={{ background:'linear-gradient(160deg,#f8fffe 0%,#f0fdf7 50%,#ecfdf5 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position:'absolute', top:'-10%', right:'-10%', width:'60%', height:'60%', borderRadius:'50%', background:'radial-gradient(circle,rgba(16,185,129,0.08) 0%,transparent 70%)', filter:'blur(50px)' }} />
          <div style={{ position:'absolute', bottom:'-10%', left:'-10%', width:'50%', height:'50%', borderRadius:'50%', background:'radial-gradient(circle,rgba(20,184,166,0.06) 0%,transparent 70%)', filter:'blur(40px)' }} />
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center mb-8">
            <img src={logoImage} alt="Krishikuta" style={{ height:44, width:'auto', objectFit:'contain' }} />
          </div>

          {/* Card */}
          <div style={{ background:'rgba(255,255,255,0.85)', backdropFilter:'blur(24px)', border:'1px solid rgba(16,185,129,0.12)', borderRadius:28, padding:'2.5rem', boxShadow:'0 32px 80px -12px rgba(16,120,80,0.15),0 4px 16px rgba(0,0,0,0.05),inset 0 1px 0 rgba(255,255,255,0.9)' }}>

            {/* Back button */}
            {step !== 'mobile' ? (
              <button onClick={handleBack}
                style={{ display:'flex', alignItems:'center', gap:4, color:'#64748b', fontSize:13, fontWeight:600, background:'none', border:'none', cursor:'pointer', marginBottom:20, padding:0 }}
              >
                <ChevronLeft style={{ width:16, height:16 }} /> Back
              </button>
            ) : (
              <button onClick={() => navigate({ to: '/ao/aao' })}
                style={{ display:'flex', alignItems:'center', gap:4, color:'#64748b', fontSize:13, fontWeight:600, background:'none', border:'none', cursor:'pointer', marginBottom:20, padding:0 }}
              >
                <ChevronLeft style={{ width:16, height:16 }} /> Back to Dashboard
              </button>
            )}

            {/* Step badge */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'1px solid rgba(22,163,74,0.2)', borderRadius:100, padding:'4px 12px', marginBottom:16 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#16a34a' }} />
              <span style={{ fontSize:11, fontWeight:700, color:'#15803d', letterSpacing:'0.05em', textTransform:'uppercase' }}>
                {step === 'mobile' ? 'Step 1 of 2' : 'Step 2 of 2'}
              </span>
            </div>

            <h2 style={{ fontSize:26, fontWeight:900, color:'#0f172a', letterSpacing:'-0.02em', marginBottom:6 }}>
              {step === 'mobile' ? 'Welcome back 👋' : `Hello, ${existingName}!`}
            </h2>
            <p style={{ fontSize:14, color:'#64748b', lineHeight:1.6, marginBottom:24 }}>
              {step === 'mobile'
                ? 'Sign in or create an account using your mobile number.'
                : `Enter your password to access your account (${existingEmail}).`}
            </p>

            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px', color:'#dc2626', fontSize:13, marginBottom:20 }}>
                {error}
              </div>
            )}

            {/* Mobile step */}
            {step === 'mobile' && (
              <form onSubmit={handleMobileSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="mobile-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile Number</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">+91</span>
                    <Input id="mobile-input" type="tel" value={mobile}
                      onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="99999 99999" className="pl-12 h-12 text-base font-semibold tracking-wide"
                      required autoFocus disabled={loading} />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Smartphone className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 gradient-primary font-bold shadow-soft" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Continue</span><ArrowRight className="w-4 h-4 ml-1.5" /></>}
                </Button>
              </form>
            )}

            {/* Password step */}
            {step === 'password' && (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="password-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                  <div className="relative mt-1.5">
                    <Input id="password-input" type="password" value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" className="h-12 pr-10"
                      required autoFocus disabled={loading} />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <KeyRound className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 gradient-primary font-bold shadow-soft" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Sign In</span><CheckCircle2 className="w-4 h-4 ml-1.5" /></>}
                </Button>
              </form>
            )}
          </div>

          <p style={{ textAlign:'center', fontSize:11, color:'#94a3b8', marginTop:20, fontWeight:500 }}>
            By continuing, you agree to Krishikuta's{' '}
            <span style={{ color:'#0e5c30', fontWeight:600 }}>Terms of Service</span>{' '}&amp;{' '}
            <span style={{ color:'#0e5c30', fontWeight:600 }}>Privacy Policy</span>.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float1{0%,100%{transform:rotate(18deg) translateY(0)}50%{transform:rotate(22deg) translateY(-14px)}}
        @keyframes float2{0%,100%{transform:rotate(-12deg) translateY(0)}50%{transform:rotate(-8deg) translateY(-10px)}}
        @keyframes float3{0%,100%{transform:rotate(8deg) translateY(0)}50%{transform:rotate(4deg) translateY(-8px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>
    </div>
  );
}
