import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { checkMobile, saveProfile } from '@/lib/exam-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Smartphone, 
  KeyRound, 
  User, 
  Mail, 
  GraduationCap, 
  MapPin, 
  ChevronLeft, 
  Loader2, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface ExamAuthFormProps {
  onSuccess: () => void;
  isModal?: boolean;
}

export function ExamAuthForm({ onSuccess, isModal = false }: ExamAuthFormProps) {
  const [step, setStep] = useState<'mobile' | 'password' | 'profile'>('mobile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('');
  const [college, setCollege] = useState('');

  // Info from check
  const [existingUserEmail, setExistingUserEmail] = useState<string | null>(null);
  const [existingUserName, setExistingUserName] = useState<string | null>(null);

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await checkMobile(mobile);
      if (res.exists && res.email) {
        setExistingUserEmail(res.email);
        setExistingUserName(res.name || 'Student');
        setStep('password');
      } else {
        // Clear previous values but keep email blank or make one up/ask for it
        setEmail('');
        setName('');
        setStep('profile');
      }
    } catch (err: any) {
      setError(err.message || 'Error checking mobile number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: existingUserEmail!,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      toast.success('Successfully logged in!');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create Auth User
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      const uid = data.user?.id;
      if (uid) {
        // 2. Save Student Profile in Database
        await saveProfile(uid, {
          name,
          email,
          mobile,
          district,
          college,
        });
      }

      toast.success('Account created successfully!');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 'password') {
      setStep('mobile');
      setPassword('');
    } else if (step === 'profile') {
      setStep('mobile');
    }
  };

  return (
    <div className={`w-full ${isModal ? 'p-0' : 'max-w-md p-8 bg-card rounded-2xl border border-border shadow-elegant animate-fade-in'}`}>
      
      {/* Header & Back Action */}
      <div className="flex items-center justify-between mb-6">
        {step !== 'mobile' ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
        ) : (
          <div /> // spacer
        )}
        
        <span className="text-xs font-bold uppercase tracking-widest text-primary/60 bg-primary/5 px-2.5 py-1 rounded-full">
          {step === 'mobile' && 'Step 1 of 2'}
          {step === 'password' && 'Step 2 of 2'}
          {step === 'profile' && 'Profile Creation'}
        </span>
      </div>

      {/* Title & Subtitle */}
      <div className="mb-6 space-y-1.5">
        <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">
          {step === 'mobile' && 'Enter Mobile Number'}
          {step === 'password' && 'Verify Password'}
          {step === 'profile' && 'Create Your Profile'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {step === 'mobile' && 'Sign in or start registration using your mobile number.'}
          {step === 'password' && `Welcome back, ${existingUserName}! Enter your password.`}
          {step === 'profile' && 'Set up your Krishikuta Exam Portal credentials to start.'}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-5 p-3.5 bg-destructive/5 border border-destructive/20 rounded-xl text-xs font-medium text-destructive animate-shake">
          {error}
        </div>
      )}

      {/* Step 1: Mobile Form */}
      {step === 'mobile' && (
        <form onSubmit={handleMobileSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="mobile-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile Number</Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">+91</span>
              <Input
                id="mobile-input"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="99999 99999"
                className="pl-12 h-12 text-base font-semibold tracking-wide"
                required
                autoFocus
                disabled={loading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Smartphone className="w-5 h-5 text-muted-foreground/50" />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 gradient-primary font-bold shadow-soft" disabled={loading}>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Continue <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        </form>
      )}

      {/* Step 2: Password Form */}
      {step === 'password' && (
        <form onSubmit={handleLoginSubmit} className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
              <span className="text-[10px] text-muted-foreground font-medium">{existingUserEmail}</span>
            </div>
            <div className="relative">
              <Input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 pr-10"
                required
                autoFocus
                disabled={loading}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <KeyRound className="w-5 h-5 text-muted-foreground/50" />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 gradient-primary font-bold shadow-soft" disabled={loading}>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Sign In <CheckCircle2 className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        </form>
      )}

      {/* Step 3: Registration Profile Form */}
      {step === 'profile' && (
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reg-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name *</Label>
            <div className="relative">
              <Input
                id="reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                disabled={loading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <User className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address *</Label>
            <div className="relative">
              <Input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Mail className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-pass" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password *</Label>
            <div className="relative">
              <Input
                id="reg-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                disabled={loading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <KeyRound className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reg-mobile" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile</Label>
              <Input
                id="reg-mobile"
                value={`+91 ${mobile}`}
                disabled
                className="bg-muted text-muted-foreground font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-district" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">District</Label>
              <div className="relative">
                <Input
                  id="reg-district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Your district"
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <MapPin className="w-4 h-4 text-muted-foreground/50" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-college" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">College / Institution</Label>
            <div className="relative">
              <Input
                id="reg-college"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="College name"
                disabled={loading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <GraduationCap className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full h-11 gradient-primary font-bold shadow-soft mt-2" disabled={loading}>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Create Account & Start'
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
