import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { listMockTests, getUserPerformance, listUserAccess, checkUserAccess } from '@/lib/exam-api';
import { supabase } from '@/lib/supabase';
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
  price: number; image_url?: string; is_active: boolean; is_free?: boolean;
}

interface Performance {
  totalAttempts: number; averageScore: number; bestScore: number;
  submissions: Array<{ id: number; score: number; total_questions: number; submitted_at: string; mock_tests?: { title: string; category: string } }>;
}

interface ExamDashboardProps {
  userId?: string;
  userEmail?: string;
  userProfile?: Record<string, any> | null;
  onRequireAuth?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Practical Exam': '#16a34a',
  'General': '#2563eb',
  'AO/AAO': '#d97706',
  'ICAR': '#7c3aed',
};

export function ExamDashboard({ userId, userEmail, userProfile, onRequireAuth }: ExamDashboardProps) {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [accessList, setAccessList] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [testsRes, perfRes] = await Promise.all([
          listMockTests(),
          userId ? getUserPerformance(userId) : Promise.resolve(null),
        ]);
        const allTests: MockTest[] = testsRes.tests || [];
        setTests(allTests.filter(t => t.is_active));
        setPerformance(perfRes);

        if (userId) {
          const { access } = await checkUserAccess(userId, []);
          if (access && access.length > 0) {
            setAccessList(access);
          }
          
          if (userEmail) {
            const { data } = await supabase.from('payment_requests').select('*').eq('user_email', userEmail).order('created_at', { ascending: false }).limit(1);
            if (data && data.length > 0 && data[0].status === 'pending') {
              setPendingPayment(data[0]);
            }
          }
        }
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    };
    load();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (userId) {
      channel = supabase.channel('user-purchases-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_purchases', filter: `user_id=eq.${userId}` },
          () => {
            // Re-fetch when access changes
            load();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  const categories = ['All', ...Array.from(new Set(tests.map(t => t.category).filter(Boolean)))];
  const filteredTests = activeCategory === 'All' ? tests : tests.filter(t => t.category === activeCategory);

  const getTestStatus = (test: MockTest): 'free' | 'unlocked' | 'paid' => {
    if (test.is_free || test.price === 0) return 'free';
    if (accessList.includes(test.id) || accessList.includes(-1)) return 'unlocked';
    return 'paid';
  };

  const renderTestCard = (test: MockTest) => {
    const status = getTestStatus(test);
    const attempt = (performance?.submissions || []).find(s => (s as any).test_id === test.id);

    return (
      <Card key={test.id} className="flex flex-col overflow-hidden border-border hover:shadow-elegant transition-all group">
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
            {status === 'free' && <Badge className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm"><Unlock className="w-3 h-3 mr-1" />FREE</Badge>}
            {status === 'unlocked' && <Badge className="text-[10px] bg-green-600 text-white border-0 shadow-sm"><Unlock className="w-3 h-3 mr-1" />Unlocked</Badge>}
            {status === 'paid' && <Badge className="text-[10px] bg-amber-600 text-white border-0 shadow-sm"><Lock className="w-3 h-3 mr-1" />Paid</Badge>}
          </div>
        </div>

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
              <Button disabled className="w-full bg-muted text-muted-foreground border-border" size="sm">
                <Lock className="w-3.5 h-3.5 mr-2" />Locked
              </Button>
            ) : (
              <Button 
                className="w-full gradient-primary" 
                size="sm"
                onClick={() => {
                  if (!userId) onRequireAuth?.();
                  else navigate({ to: `/exam-test/${test.id}` as any });
                }}
              >
                <Clock className="w-3.5 h-3.5 mr-2" />
                {attempt ? 'Retake Test' : 'Start Test'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
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

  const accessibleTests = accessList.includes(-1) ? tests : tests.filter(t => getTestStatus(t) === 'free' || getTestStatus(t) === 'unlocked');

  const stats = [
    { icon: BookOpen, label: 'Tests Available', value: accessibleTests.length, color: 'text-blue-600' },
    { icon: FileText, label: 'Attempts', value: performance?.totalAttempts ?? 0, color: 'text-green-600' },
    { icon: TrendingUp, label: 'Avg Score', value: `${performance?.averageScore ?? 0}%`, color: 'text-amber-600' },
    { icon: Trophy, label: 'Total Questions', value: `${accessibleTests.reduce((acc, t) => acc + (t.total_questions ?? 0), 0)}`, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, label, value, color }) => (
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
          <div className="space-y-8">
            {/* Promo Cards Grid */}
            <div className={`grid gap-6 ${!accessList.includes(-1) ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
              
              {/* Free Exams Promo Card */}
              {tests.filter(t => getTestStatus(t) === 'free').length > 0 && (
                <Card className="p-8 bg-gradient-to-br from-emerald-50 to-green-50/50 border-emerald-200 flex flex-col items-start gap-4 overflow-hidden relative group">
                  <div className="absolute right-0 bottom-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mb-10 pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700" />
                  <div className="space-y-2 relative z-10 w-full">
                    <h2 className="text-2xl font-extrabold text-emerald-900 flex items-center gap-2">
                      <Unlock className="w-6 h-6 text-emerald-600" /> Free Exams
                    </h2>
                    <p className="text-emerald-800/80">Access our collection of free mock tests and practice materials to get started.</p>
                  </div>
                  <div className="relative z-10 mt-auto w-full md:w-auto pt-4">
                    <Button 
                      onClick={() => navigate({ to: '/exam/free' })} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 px-8 py-6 text-lg rounded-full w-full md:w-auto"
                    >
                      Open
                    </Button>
                  </div>
                </Card>
              )}

              {/* Premium Promo Card */}
              <Card className="p-8 bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200 flex flex-col items-start gap-4 overflow-hidden relative group">
                <div className="absolute right-0 bottom-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mb-10 pointer-events-none group-hover:bg-amber-500/20 transition-all duration-700" />
                <div className="space-y-2 relative z-10 w-full">
                  <h2 className="text-2xl font-extrabold text-amber-900 flex items-center gap-2">
                    {accessList.includes(-1) ? (
                      <><Unlock className="w-6 h-6 text-amber-600" /> Premium Access</>
                    ) : (
                      <><Lock className="w-6 h-6 text-amber-600" /> Get Full Access</>
                    )}
                  </h2>
                  <p className="text-amber-800/80">
                    {accessList.includes(-1) 
                      ? "You have unrestricted access to all premium mock tests, previous year papers, and analytics." 
                      : "Get unrestricted access to all premium mock tests, previous year papers, and detailed performance analytics."}
                  </p>
                </div>
                <div className="relative z-10 mt-auto w-full md:w-auto pt-4 flex gap-3">
                  {accessList.includes(-1) ? (
                    <Button 
                      onClick={() => navigate({ to: '/exam/premium' })} 
                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 px-8 py-6 text-lg rounded-full w-full md:w-auto"
                    >
                      Open Now
                    </Button>
                  ) : pendingPayment ? (
                    <Button 
                      onClick={() => navigate({ to: '/exam-checkout' })} 
                      className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 px-8 py-6 text-lg rounded-full w-full md:w-auto"
                    >
                      Pending (Edit UTR)
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => {
                        if (!userId) onRequireAuth?.();
                        else navigate({ to: '/exam/premium' });
                      }} 
                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 px-8 py-6 text-lg rounded-full w-full md:w-auto"
                    >
                      Unlock Now
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          </div>
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

