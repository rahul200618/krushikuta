import { useState, useEffect } from 'react';
import { listUserAccess, grantAccess, revokeAccess, listPaymentRequests, updatePaymentRequest, listStudentProfiles } from '@/lib/exam-api';
import { listMockTests } from '@/lib/exam-api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ShieldCheck, ShieldX, CheckCircle, XCircle, Loader2, Users, CreditCard, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Purchase {
  id: number; user_id: string; mock_test_id: number; amount: number;
  status: string; payment_method: string; email: string; purchased_at: string;
  student_profiles?: { name: string; mobile: string; college: string };
}

interface PaymentRequest {
  id: number; user_email: string; utr: string; amount: number; status: string; created_at: string;
}

interface MockTest { id: number; title: string; category: string; price: number; }
interface StudentProfile { firebase_uid: string; name: string; email: string; mobile: string; college: string; created_at: string; category?: string; }

export function AccessManagerPanel() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [paymentReqs, setPaymentReqs] = useState<PaymentRequest[]>([]);
  const [tests, setTests] = useState<MockTest[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Grant form
  const [grantEmail, setGrantEmail] = useState('');
  const [grantTestId, setGrantTestId] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);

  // Search
  const [accessSearch, setAccessSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [purchaseRes, payRes, testsRes, stuRes] = await Promise.all([
        listUserAccess(),
        listPaymentRequests(),
        listMockTests(),
        listStudentProfiles(),
      ]);
      setPurchases(purchaseRes.purchases || []);
      setPaymentReqs(payRes.requests || []);
      setTests(testsRes.tests || []);
      setStudents(stuRes.profiles || []);

      const warnings = [
        purchaseRes.error && `Purchases: ${purchaseRes.error}`,
        payRes.error && `Payment Requests: ${payRes.error}`,
        testsRes.error && `Mock Tests: ${testsRes.error}`,
        stuRes.error && `Student Profiles: ${stuRes.error}`
      ].filter(Boolean);

      if (warnings.length > 0) {
        toast.warning('Warning: Some data tables could not be loaded. Please check your Supabase schema: ' + warnings.join(', '));
      }
    } catch { toast.error('Failed to load access data'); } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail || !grantTestId) { toast.error('Enter student email and select a test'); return; }
    
    const student = students.find(s => s.email?.toLowerCase() === grantEmail.toLowerCase().trim());

    setGrantLoading(true);
    try {
      const testId = parseInt(grantTestId);
      await grantAccess({ 
        userId: student?.firebase_uid || '', 
        testId, 
        email: grantEmail.trim(), 
        amount: 0, 
        paymentMethod: 'Admin Granted' 
      });
      toast.success('Access granted!');
      setGrantEmail(''); setGrantTestId('');
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to grant access');
    } finally {
      setGrantLoading(false);
    }
  };

  const handleRevoke = async (userId: string, testId: number) => {
    try {
      await revokeAccess(userId, testId);
      setPurchases(p => p.map(pu => pu.user_id === userId && pu.mock_test_id === testId ? { ...pu, status: 'revoked' } : pu));
      toast.success('Access revoked');
    } catch { toast.error('Failed to revoke'); }
  };

  const handleRegrant = async (userId: string, testId: number, email: string) => {
    try {
      await grantAccess({ userId, testId, email, amount: 0, paymentMethod: 'Admin Granted' });
      setPurchases(p => p.map(pu => pu.user_id === userId && pu.mock_test_id === testId ? { ...pu, status: 'active' } : pu));
      toast.success('Access re-granted');
    } catch { toast.error('Failed to re-grant'); }
  };

  const handleApprovePayment = async (req: PaymentRequest) => {
    try {
      const profile = students.find(s => s.email === req.user_email);
      
      await updatePaymentRequest(req.id, 'approved', profile?.firebase_uid);
      setPaymentReqs(p => p.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
      toast.success('Payment approved & access granted!');
      fetchAll();
    } catch { toast.error('Failed to approve'); }
  };

  const handleDeclinePayment = async (id: number) => {
    try {
      await updatePaymentRequest(id, 'declined');
      setPaymentReqs(p => p.map(r => r.id === id ? { ...r, status: 'declined' } : r));
      toast.success('Request declined');
    } catch { toast.error('Failed to decline'); }
  };

  const filteredPurchases = purchases.filter(p =>
    p.email?.toLowerCase().includes(accessSearch.toLowerCase()) ||
    p.user_id?.toLowerCase().includes(accessSearch.toLowerCase())
  );

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.mobile?.includes(studentSearch)
  );

  const pendingPayments = paymentReqs.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Access Manager</h3>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Purchases', value: purchases.length, icon: ShieldCheck, color: 'text-green-600' },
          { label: 'Students Registered', value: students.length, icon: Users, color: 'text-blue-600' },
          { label: 'Pending Payments', value: pendingPayments.length, icon: CreditCard, color: pendingPayments.length > 0 ? 'text-red-500' : 'text-muted-foreground' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4 flex items-center gap-3 border-border">
            <Icon className={`w-7 h-7 ${color} shrink-0`} />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="grant">
        <TabsList className="mb-4">
          <TabsTrigger value="grant">Grant Access</TabsTrigger>
          <TabsTrigger value="purchases">All Purchases</TabsTrigger>
          <TabsTrigger value="payments" className="relative">
            Payments
            {pendingPayments.length > 0 && (
              <span className="ml-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{pendingPayments.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        {/* Grant Access Form */}
        <TabsContent value="grant">
          <Card className="p-6 border-border max-w-lg">
            <h4 className="font-bold mb-4">Manually Grant Test Access</h4>
            <form onSubmit={handleGrantAccess} className="space-y-4">
              <div className="space-y-1">
                <Label>Student Email</Label>
                <Input value={grantEmail} onChange={e => setGrantEmail(e.target.value)} placeholder="student@example.com" required />
              </div>
              <div className="space-y-1">
                <Label>Select Test</Label>
                <Select value={grantTestId} onValueChange={setGrantTestId} required>
                  <SelectTrigger><SelectValue placeholder="Choose a test..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">🔓 All-Access Bundle (Test ID: -1)</SelectItem>
                    {tests.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.title} (₹{t.price})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="gradient-primary w-full" disabled={grantLoading}>
                {grantLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Grant Access
              </Button>
            </form>
          </Card>
        </TabsContent>

        {/* Purchases table */}
        <TabsContent value="purchases">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={accessSearch} onChange={e => setAccessSearch(e.target.value)} className="pl-10" placeholder="Search by email or user ID..." />
          </div>
          <Card className="p-0 overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">Student</th>
                    <th className="px-5 py-3 text-left">Test ID</th>
                    <th className="px-5 py-3 text-left">Method</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No purchases found.</td></tr>
                  ) : filteredPurchases.map(p => (
                    <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-xs">{p.email || '—'}</div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[160px]">{p.user_id}</div>
                      </td>
                      <td className="px-5 py-3 font-bold">{p.mock_test_id === -1 ? '★ All' : `#${p.mock_test_id}`}</td>
                      <td className="px-5 py-3 text-xs">{p.payment_method}</td>
                      <td className="px-5 py-3">
                        <Badge className={`text-[10px] ${p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {p.status === 'active' ? (
                          <Button size="sm" variant="ghost" className="text-destructive text-xs h-7" onClick={() => handleRevoke(p.user_id, p.mock_test_id)}>
                            <ShieldX className="w-3.5 h-3.5 mr-1" />Revoke
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-green-600 text-xs h-7" onClick={() => handleRegrant(p.user_id, p.mock_test_id, p.email)}>
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" />Re-grant
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Payment requests */}
        <TabsContent value="payments">
          <Card className="p-0 overflow-hidden border-border">
            <div className="p-4 border-b bg-muted/20">
              <h4 className="font-bold">UTR / Manual Payment Requests</h4>
            </div>
            <div className="divide-y divide-border">
              {paymentReqs.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">No payment requests yet.</p>
              ) : paymentReqs.map(r => (
                <div key={r.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{r.user_email}</p>
                    <p className="text-xs text-muted-foreground">UTR: <span className="font-mono font-bold text-foreground">{r.utr}</span></p>
                    <p className="text-xs text-muted-foreground">Amount: ₹{r.amount} • {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${r.status === 'pending' ? 'bg-amber-100 text-amber-800' : r.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {r.status}
                    </Badge>
                    {r.status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-8" onClick={() => handleApprovePayment(r)}>
                          <CheckCircle className="w-3 h-3 mr-1" />Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-300 text-xs h-8" onClick={() => handleDeclinePayment(r.id)}>
                          <XCircle className="w-3 h-3 mr-1" />Decline
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Students */}
        <TabsContent value="students">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="pl-10" placeholder="Search by name, email or phone..." />
          </div>
          <Card className="p-0 overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">Name</th>
                    <th className="px-5 py-3 text-left">Contact</th>
                    <th className="px-5 py-3 text-left">College</th>
                    <th className="px-5 py-3 text-left">Registered</th>
                    <th className="px-5 py-3 text-left">UID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No students found.</td></tr>
                  ) : filteredStudents.map(s => (
                    <tr key={s.firebase_uid} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3 font-semibold">{s.name}</td>
                      <td className="px-5 py-3"><div>{s.mobile || '—'}</div><div className="text-xs text-muted-foreground">{s.email}</div></td>
                      <td className="px-5 py-3 text-xs">
                        <div>{s.college || '—'}</div>
                        {s.category && (
                          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                            {s.category}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3 font-mono text-[10px] text-muted-foreground truncate max-w-[120px]" title={s.firebase_uid}>{s.firebase_uid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
