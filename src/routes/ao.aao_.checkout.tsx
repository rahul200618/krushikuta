import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { submitPaymentRequest } from '@/lib/exam-api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, CheckCircle2, Lock, ShieldCheck, Copy, Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/ao/aao_/checkout')({
  component: ExamCheckoutPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      package: (search.package as 'six_papers' | 'all_papers') || 'all_papers',
    };
  },
  head: () => ({ meta: [{ title: 'Checkout — Krishikuta' }] }),
});

const DEFAULT_QR = "https://placehold.co/300x300?text=Scan+to+Pay+3000";

function ExamCheckoutPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<'six_papers' | 'all_papers'>(search.package || 'all_papers');
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [qrUrl, setQrUrl] = useState(DEFAULT_QR);
  const [upiId, setUpiId] = useState('');
  const [copied, setCopied] = useState(false);

  const PACKAGES = {
    six_papers: {
      title: "First 6 Paper Releases",
      originalPrice: 4000,
      price: 2799,
      discount: 1201,
      description: "Unlock access to the first 6 premium mock test sets (18 papers total)"
    },
    all_papers: {
      title: "All-Access Premium Bundle",
      originalPrice: 6000,
      price: 4799,
      discount: 1201,
      description: "Unlock absolute lifetime access to all 12 mock test sets (36 papers total)"
    }
  };

  const currentPkg = PACKAGES[selectedPackage];

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error('Please sign in first');
        navigate({ to: '/ao/aao' });
        return;
      }
      setSession(data.session);

      // Fetch admin uploaded QR
      const { data: qrData } = supabase.storage.from('public1').getPublicUrl('premium_qr.jpg');
      if (qrData?.publicUrl) {
        setQrUrl(qrData.publicUrl + `?t=${Date.now()}`); // cache bust
      }

      // Fetch admin configured UPI ID
      try {
        const { data: upiData, error: upiError } = await supabase
          .from('site_settings')
          .select('id')
          .like('id', 'upi_id:%')
          .maybeSingle();
        if (!upiError && upiData?.id) {
          setUpiId(upiData.id.replace('upi_id:', ''));
        }
      } catch (err) {
        console.error('Error fetching UPI ID:', err);
      }

      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleCopy = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    toast.success('UPI ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utr.trim()) return toast.error('Please enter the UTR / Transaction ID');
    
    const email = session?.user?.email;
    if (!email) {
      toast.error('Your user session is missing an email address. Please sign in again.');
      return;
    }

    setSubmitting(true);
    try {
      await submitPaymentRequest(email, utr.trim(), currentPkg.price);
      setDone(true);
      toast.success('Payment details submitted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Realtime + polling to auto-redirect after admin approves
  useEffect(() => {
    if (!session?.user?.email || !done) return;

    const email = session.user.email;
    let redirected = false;

    const handleApproved = () => {
      if (redirected) return;
      redirected = true;
      toast.success('🎉 Payment approved! Unlocking premium access…', { duration: 3000 });
      setTimeout(() => navigate({ to: '/ao/aao' }), 2500);
    };

    const handleDeclined = () => {
      if (redirected) return;
      toast.error('Payment was declined. Please check your UTR and try again.');
      setDone(false);
    };

    // ── 1. Supabase Realtime ──────────────────────────────────────────────
    const channel = supabase.channel('checkout-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payment_requests', filter: `user_email=eq.${email}` },
        (payload) => {
          if (payload.new.status === 'approved') handleApproved();
          else if (payload.new.status === 'declined') handleDeclined();
        }
      )
      .subscribe();

    // ── 2. Polling fallback every 5 s ─────────────────────────────────────
    const poll = setInterval(async () => {
      try {
        const { getPaymentStatus } = await import('@/lib/exam-api');
        const res = await getPaymentStatus(email);
        if (res.status === 'approved') handleApproved();
        else if (res.status === 'declined') handleDeclined();
      } catch (_) { /* silent */ }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [session, done, navigate]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!session) return null;

  return (
    <div className="bg-muted/30 min-h-screen py-10">
      <div className="container-px mx-auto max-w-4xl">
        <Link to="/ao/aao" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
        </Link>
        
        <div className="grid md:grid-cols-2 gap-8 items-start">
          
          {/* Order Details & Summary */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold flex items-center gap-2 text-foreground tracking-tight">
                <Lock className="w-6 h-6 text-amber-500 shrink-0"/> Unlock Premium
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">Select a package to unlock premium test papers.</p>
            </div>

            {/* Package Selector */}
            <div className="space-y-3">
              <div 
                onClick={() => setSelectedPackage('six_papers')} 
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-1 relative overflow-hidden ${
                  selectedPackage === 'six_papers' 
                    ? 'border-emerald-600 bg-emerald-50/30 shadow-sm' 
                    : 'border-border bg-white hover:border-emerald-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-950 text-sm">{PACKAGES.six_papers.title}</span>
                  <span className="font-bold text-emerald-700 text-base">₹{PACKAGES.six_papers.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">{PACKAGES.six_papers.description}</p>
              </div>

              <div 
                onClick={() => setSelectedPackage('all_papers')} 
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-1 relative overflow-hidden ${
                  selectedPackage === 'all_papers' 
                    ? 'border-emerald-600 bg-emerald-50/30 shadow-sm' 
                    : 'border-border bg-white hover:border-emerald-200'
                }`}
              >
                <div className="absolute right-0 top-0 bg-emerald-600 text-white text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-bl-lg">
                  Best Value
                </div>
                <div className="flex justify-between items-center pr-16">
                  <span className="font-bold text-emerald-950 text-sm">{PACKAGES.all_papers.title}</span>
                  <span className="font-bold text-emerald-700 text-base">₹{PACKAGES.all_papers.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">{PACKAGES.all_papers.description}</p>
              </div>
            </div>
            
            <Card className="p-5 border border-border shadow-sm bg-white">
              <h2 className="font-bold text-sm mb-3 uppercase tracking-wider text-muted-foreground">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between pb-2 border-b border-muted">
                  <span className="text-muted-foreground">{currentPkg.title}</span>
                  <span className="font-medium line-through text-muted-foreground">₹{currentPkg.originalPrice}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-muted text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span>- ₹{currentPkg.discount}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold">Total Amount</span>
                  <span className="text-2xl font-extrabold text-primary">₹{currentPkg.price}</span>
                </div>
              </div>
            </Card>

            <div className="flex items-start gap-2.5 bg-emerald-50/50 text-emerald-900 p-3.5 rounded-xl border border-emerald-100/50">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <p className="text-xs font-medium leading-relaxed">Admin will verify your payment UTR and unlock premium access within 2-4 hours.</p>
            </div>
          </div>

          {/* Checkout Payment Card */}
          <Card className="border border-border shadow-md bg-white p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 gradient-primary" />
            {done ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Request Submitted!</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  We have received your UTR number. Access will be unlocked as soon as the payment is confirmed.
                </p>

                {/* WhatsApp share button */}
                <div className="pt-2 space-y-3">
                  <p className="text-xs text-muted-foreground">Speed up verification — share your payment details on WhatsApp:</p>
                  <a
                    href={`https://wa.me/916360749270?text=${encodeURIComponent(
                      `Hi, I have made a payment for Krishikuta Premium Access.%0AEmail: ${session?.user?.email}%0AUTR / Txn ID: ${utr}%0APackage: ${currentPkg.title} (₹${currentPkg.price})%0APlease verify and activate my access. Thank you!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-sm transition-all shadow-md hover:shadow-lg active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Share on WhatsApp
                  </a>
                </div>

                <Link to="/ao/aao" className="inline-block pt-1">
                  <Button variant="outline" size="sm">Return to Dashboard</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-foreground">Scan & Pay via UPI</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Use any UPI app (GPay, PhonePe, Paytm, etc.)</p>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="p-1.5 bg-white border border-border rounded-xl shadow-sm">
                      <img src={qrUrl} alt="UPI QR Code" className="w-44 h-44 object-contain rounded-lg" />
                    </div>
                  </div>

                  {upiId && (
                    <div className="flex flex-col items-center pt-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">Or pay to UPI ID</span>
                      <div className="flex items-center gap-1.5 bg-muted/80 pl-3 pr-1 py-1 rounded-full border border-border max-w-xs w-full justify-between hover:bg-muted transition-colors">
                        <span className="text-xs font-mono font-extrabold text-foreground select-all truncate">{upiId}</span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 rounded-full shrink-0 text-muted-foreground hover:text-foreground hover:bg-background shadow-none"
                          onClick={handleCopy}
                          type="button"
                          title="Copy UPI ID"
                        >
                          {copied ? <Check className="w-3 h-3 text-green-600 animate-scale-in" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-muted">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-foreground">Enter UTR / Transaction ID <span className="text-red-500">*</span></label>
                    <Input 
                      value={utr} 
                      onChange={e => setUtr(e.target.value)} 
                      placeholder="Enter 12-digit UTR number" 
                      className="font-mono text-sm py-4 h-10 focus:ring-emerald-600 focus:border-emerald-600"
                      required
                      maxLength={25}
                    />
                    <p className="text-[10px] text-muted-foreground">Find this in your UPI app payment transaction history.</p>
                  </div>
                  
                  <Button type="submit" className="w-full h-11 text-sm font-bold gradient-primary shadow-soft" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {submitting ? 'Submitting...' : 'Submit Payment Details'}
                  </Button>
                </form>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
