import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { submitPaymentRequest } from '@/lib/exam-api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/ao/aao_/checkout')({
  component: ExamCheckoutPage,
  head: () => ({ meta: [{ title: 'Checkout — Krishikuta' }] }),
});

const DEFAULT_QR = "https://placehold.co/300x300?text=Scan+to+Pay+3000";

function ExamCheckoutPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [qrUrl, setQrUrl] = useState(DEFAULT_QR);

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
      const { data: qrData } = supabase.storage.from('public').getPublicUrl('premium_qr.jpg');
      if (qrData?.publicUrl) {
        setQrUrl(qrData.publicUrl + `?t=${Date.now()}`); // cache bust
      }

      setLoading(false);
    };
    init();
  }, [navigate]);

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
      await submitPaymentRequest(email, utr.trim(), 3000);
      setDone(true);
      toast.success('Payment details submitted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Realtime listener for approval
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    if (session?.user?.email && done) {
      channel = supabase.channel('checkout-realtime')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'payment_requests', filter: `user_email=eq.${session.user.email}` },
          (payload) => {
            if (payload.new.status === 'approved') {
              toast.success('Your payment was approved! Redirecting to dashboard...');
              setTimeout(() => navigate({ to: '/ao/aao' }), 2000);
            } else if (payload.new.status === 'declined') {
              toast.error('Your payment was declined. Please verify your UTR and try again.');
              setDone(false);
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [session, done, navigate]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!session) return null;

  return (
    <div className="bg-muted/30 min-h-screen py-12">
      <div className="container-px mx-auto max-w-5xl">
        <Link to="/ao/aao" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>
        
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          
          {/* Order Summary */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold flex items-center gap-2"><Lock className="w-7 h-7 text-amber-600"/> Unlock Premium</h1>
              <p className="text-muted-foreground mt-2">Get lifetime access to all mock tests, previous year question papers, and in-depth performance analytics.</p>
            </div>
            
            <Card className="p-6 border-0 shadow-sm">
              <h2 className="font-bold text-lg mb-4">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between pb-3 border-b border-border">
                  <span className="text-muted-foreground">All-Access Premium Bundle</span>
                  <span className="font-semibold line-through text-muted-foreground">₹5,000</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-border text-green-600 font-medium">
                  <span>Special Discount</span>
                  <span>- ₹2,000</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="font-bold text-lg">Total Amount</span>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-primary">₹3,000</span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex items-start gap-3 bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100">
              <ShieldCheck className="w-6 h-6 shrink-0 text-blue-600" />
              <p className="text-sm">Your payment is processed manually. Once you transfer the amount and submit the UTR, our admin will verify and activate your premium access within 2-4 hours.</p>
            </div>
          </div>

          {/* Payment & UTR Form */}
          <Card className="p-6 lg:p-8 border-t-4 border-t-amber-500 shadow-xl relative overflow-hidden">
            {done ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold">Request Submitted!</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">We've received your UTR number. Your premium access will be unlocked automatically as soon as the admin verifies your payment.</p>
                <Link to="/ao/aao" className="inline-block pt-4">
                  <Button variant="outline">Return to Dashboard</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="font-bold text-xl mb-1">Scan & Pay via UPI</h3>
                  <p className="text-sm text-muted-foreground">Open any UPI app (GPay, PhonePe, Paytm) to scan the code.</p>
                  <div className="mt-6 flex justify-center">
                    <div className="p-2 bg-white border border-gray-200 rounded-2xl shadow-sm">
                      <img src={qrUrl} alt="UPI QR Code" className="w-56 h-56 object-contain rounded-xl" />
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 pt-6 border-t border-border">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Enter UTR / Transaction ID <span className="text-red-500">*</span></label>
                    <p className="text-xs text-muted-foreground mb-2">You can find the 12-digit UTR or Txn ID in your UPI app's history.</p>
                    <Input 
                      value={utr} 
                      onChange={e => setUtr(e.target.value)} 
                      placeholder="e.g. 301234567890" 
                      className="font-mono text-lg py-6"
                      required
                      maxLength={25}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full h-14 text-lg font-bold gradient-primary" disabled={submitting}>
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
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
