import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { listMockTests, getUserPerformance, checkUserAccess } from '@/lib/exam-api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadialBarChart,
  RadialBar, Legend, Cell,
} from 'recharts';
import { Trophy, Clock, TrendingUp, BookOpen, Lock, Unlock, Loader2, Star, IndianRupee, FileText, ChevronLeft, Folder } from 'lucide-react';

interface MockTest {
  id: number; title: string; description: string; category: string;
  price: number; image_url?: string; is_active: boolean;
}

interface Performance {
  totalAttempts: number; averageScore: number; bestScore: number;
  submissions: Array<{ id: number; score: number; total_questions: number; submitted_at: string; mock_tests?: { title: string; category: string } }>;
}

interface ExamDashboardProps {
  userId: string;
  userEmail: string;
  userProfile: Record<string, unknown> | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Practical Exam': '#16a34a',
  'General': '#2563eb',
  'AO/AAO': '#d97706',
  'ICAR': '#7c3aed',
};

export function ExamDashboard({ userId, userEmail, userProfile }: ExamDashboardProps) {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [accessList, setAccessList] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [testsRes, perfRes] = await Promise.all([
          listMockTests(),
          getUserPerformance(userId),
        ]);
        const allTests: MockTest[] = testsRes.tests || [];
        setTests(allTests.filter(t => t.is_active));
        setPerformance(perfRes);

        const paidIds = allTests.filter(t => t.price > 0).map(t => t.id);
        if (paidIds.length > 0) {
          const accessRes = await checkUserAccess(userId, paidIds);
          setAccessList(accessRes.accessList || []);
        }
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const categories = ['All', ...Array.from(new Set(tests.map(t => t.category).filter(Boolean)))];
  const filteredTests = activeCategory === 'All' ? tests : tests.filter(t => t.category === activeCategory);

  const getTestStatus = (test: MockTest): 'free' | 'unlocked' | 'paid' => {
    if (test.price === 0) return 'free';
    if (accessList.includes(test.id) || accessList.includes(-1)) return 'unlocked';
    return 'paid';
  };

  const chartData = (performance?.submissions || [])
    .slice(0, 8)
    .reverse()
    .map((s, i) => ({
      name: `Test ${i + 1}`,
      score: s.score,
      total: s.total_questions,
      pct: s.total_questions ? Math.round((s.score / (s.total_questions * 4)) * 100) : 0,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: 'Tests Available', value: tests.length, color: 'text-blue-600' },
          { icon: FileText, label: 'Attempts', value: performance?.totalAttempts ?? 0, color: 'text-green-600' },
          { icon: TrendingUp, label: 'Avg Score', value: `${performance?.averageScore ?? 0}`, color: 'text-amber-600' },
          { icon: Trophy, label: 'Best Score', value: `${performance?.bestScore ?? 0}`, color: 'text-purple-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="p-4 flex items-center gap-4 border-border hover:shadow-soft transition-all">
            <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="tests">
        <TabsList className="mb-6">
          <TabsTrigger value="tests">Exams</TabsTrigger>
          <TabsTrigger value="performance">My Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-6">
          {activeCategory === 'All' ? (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Select a Subject</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {categories.filter(c => c !== 'All').map(subject => {
                  const subjectTests = tests.filter(t => t.category === subject);
                  return (
                    <Card 
                      key={subject} 
                      className="p-6 flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:shadow-elegant hover:border-primary/50 transition-all group"
                      onClick={() => setActiveCategory(subject)}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Folder className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{subject}</h3>
                        <p className="text-sm text-muted-foreground">{subjectTests.length} Papers</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <Button variant="ghost" onClick={() => setActiveCategory('All')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back to Subjects
              </Button>
              
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h2 className="text-2xl font-bold">{activeCategory}</h2>
                <Badge variant="secondary">{filteredTests.length} Papers</Badge>
              </div>

              {filteredTests.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl">
                  No tests available in this subject yet.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredTests.map(test => {
                        const status = getTestStatus(test);
                        const attempt = (performance?.submissions || []).find(s => (s as any).test_id === test.id);

                        return (
                          <Card key={test.id} className="flex flex-col overflow-hidden border-border hover:shadow-elegant transition-all group">
                            {/* Header */}
                            <div
                              className="h-24 relative flex items-end p-4 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent"
                              style={{ backgroundImage: test.image_url ? `url(${test.image_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/60" />
                              <div className="relative flex items-center justify-between w-full">
                                <Badge
                                  className="text-[10px] px-2 py-0.5"
                                  style={{ backgroundColor: CATEGORY_COLORS[test.category] || '#16a34a', color: '#fff' }}
                                >
                                  {test.category}
                                </Badge>
                                {status === 'free' && <Badge variant="secondary" className="text-[10px]">FREE</Badge>}
                                {status === 'unlocked' && <Badge className="text-[10px] bg-green-600 text-white"><Unlock className="w-3 h-3 mr-1" />Unlocked</Badge>}
                                {status === 'paid' && <Badge className="text-[10px] bg-amber-600 text-white"><Lock className="w-3 h-3 mr-1" />Paid</Badge>}
                              </div>
                            </div>

                            {/* Body */}
                            <div className="p-4 flex-1 flex flex-col gap-3">
                              <h3 className="font-bold text-base leading-snug">{test.title}</h3>
                              {test.description && <p className="text-xs text-muted-foreground line-clamp-2">{test.description}</p>}

                              {attempt && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Star className="w-3 h-3 text-amber-500" />
                                  Last score: <span className="font-semibold text-foreground">{attempt.score}</span>
                                </div>
                              )}

                              <div className="mt-auto pt-2">
                                {status === 'paid' ? (
                                  <div className="space-y-2">
                                    <p className="text-sm font-bold flex items-center gap-1">
                                      <IndianRupee className="w-3.5 h-3.5" />{test.price}
                                    </p>
                                    <PurchaseFlow test={test} userEmail={userEmail} userId={userId} />
                                  </div>
                                ) : (
                                  <Link to={`/exam-test/${test.id}` as any}>
                                    <Button className="w-full gradient-primary" size="sm">
                                      <Clock className="w-3.5 h-3.5 mr-2" />
                                      {attempt ? 'Retake Test' : 'Start Test'}
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
        </TabsContent>

        <TabsContent value="performance">
          {!performance || performance.totalAttempts === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl">
              No completed tests yet. Take your first test to see performance here!
            </div>
          ) : (
            <div className="space-y-8">
              {/* Radial summary */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-bold mb-4">Score Trend (Last 8 Attempts)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [`${v}`, 'Score']} />
                      <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={`hsl(${130 + i * 10}, 60%, 40%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold mb-4">Performance Summary</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Total Attempts', value: performance.totalAttempts },
                      { label: 'Average Score', value: performance.averageScore },
                      { label: 'Best Score', value: performance.bestScore },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className="font-bold text-lg">{value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* History table */}
              <Card className="p-0 overflow-hidden">
                <div className="p-4 border-b bg-muted/20">
                  <h3 className="font-bold">Attempt History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground text-xs uppercase">
                      <tr>
                        <th className="px-5 py-3 text-left">Test</th>
                        <th className="px-5 py-3 text-left">Date</th>
                        <th className="px-5 py-3 text-right">Score</th>
                        <th className="px-5 py-3 text-right">%</th>
                        <th className="px-5 py-3 text-center">Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performance.submissions.map(s => {
                        const maxScore = s.total_questions * 4;
                        const pct = maxScore ? Math.round((s.score / maxScore) * 100) : 0;
                        return (
                          <tr key={s.id} className="border-b hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3 font-medium">{s.mock_tests?.title || `Test #${s.id}`}</td>
                            <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(s.submitted_at).toLocaleDateString()}</td>
                            <td className="px-5 py-3 text-right font-bold">{s.score}</td>
                            <td className="px-5 py-3 text-right">
                              <span className={`font-bold ${pct >= 60 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <Link to={`/exam-report/${s.id}` as any}>
                                <Button variant="outline" size="sm" className="text-xs h-7">View</Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Inline purchase flow component
function PurchaseFlow({ test, userEmail, userId }: { test: MockTest; userEmail: string; userId: string }) {
  const [mode, setMode] = useState<'idle' | 'utr'>('idle');
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmitUTR = async () => {
    if (!utr.trim()) return;
    setSubmitting(true);
    try {
      const { submitPaymentRequest } = await import('@/lib/exam-api');
      await submitPaymentRequest(userEmail, utr, test.price);
      setDone(true);
    } catch { /* silent */ } finally {
      setSubmitting(false);
    }
  };

  if (done) return <p className="text-xs text-green-600 font-medium">✓ Payment request submitted! Admin will verify within 24h.</p>;

  if (mode === 'utr') return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Transfer ₹{test.price} to our UPI and enter the UTR/Transaction ID below.</p>
      <div className="flex gap-2">
        <input
          className="flex-1 text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="UTR / Txn ID"
          value={utr}
          onChange={e => setUtr(e.target.value)}
        />
        <Button size="sm" className="gradient-primary text-xs" onClick={handleSubmitUTR} disabled={submitting}>
          {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Submit'}
        </Button>
      </div>
      <button onClick={() => setMode('idle')} className="text-[10px] text-muted-foreground hover:underline">Cancel</button>
    </div>
  );

  return (
    <Button size="sm" variant="outline" className="w-full text-xs border-amber-500 text-amber-700 hover:bg-amber-50" onClick={() => setMode('utr')}>
      <IndianRupee className="w-3 h-3 mr-1" />Pay & Submit UTR
    </Button>
  );
}
