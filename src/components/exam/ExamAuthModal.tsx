import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { saveProfile } from '@/lib/exam-api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Loader2, BookOpen } from 'lucide-react';

interface ExamAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ExamAuthModal({ open, onOpenChange, onSuccess }: ExamAuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup state
  const [signupData, setSignupData] = useState({
    name: '', email: '', password: '', mobile: '', college: '', district: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) { setError(error.message); return; }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to connect. Please check your internet connection or Supabase configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signUp({ email: signupData.email, password: signupData.password });
      if (error) { setError(error.message); return; }

      const uid = data.user?.id;
      if (uid) {
        await saveProfile(uid, {
          name: signupData.name, email: signupData.email,
          mobile: signupData.mobile, college: signupData.college,
          district: signupData.district,
        }).catch(() => {});
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to connect. Please check your internet connection or Supabase configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <DialogTitle className="text-xl">Exam Portal</DialogTitle>
          </div>
          <DialogDescription>Sign in or create an account to access the exam portal.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as 'login' | 'signup'); setError(''); }}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="student@example.com" required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GraduationCap className="w-4 h-4 mr-2" />}
                Sign In
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label>Full Name</Label>
                  <Input value={signupData.name} onChange={e => setSignupData(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" required />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Email</Label>
                  <Input type="email" value={signupData.email} onChange={e => setSignupData(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" required />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Password</Label>
                  <Input type="password" value={signupData.password} onChange={e => setSignupData(p => ({ ...p, password: e.target.value }))} placeholder="Min. 6 characters" required />
                </div>
                <div className="space-y-1">
                  <Label>Mobile</Label>
                  <Input value={signupData.mobile} onChange={e => setSignupData(p => ({ ...p, mobile: e.target.value }))} placeholder="+91 XXXXX" />
                </div>
                <div className="space-y-1">
                  <Label>District</Label>
                  <Input value={signupData.district} onChange={e => setSignupData(p => ({ ...p, district: e.target.value }))} placeholder="Your district" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>College / Institution</Label>
                  <Input value={signupData.college} onChange={e => setSignupData(p => ({ ...p, college: e.target.value }))} placeholder="College name" />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GraduationCap className="w-4 h-4 mr-2" />}
                Create Account & Start
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
