import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { listMockTests, getUserPerformance, listUserAccess, checkUserAccess } from '@/lib/exam-api';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trophy, Clock, BookOpen, Lock, Unlock, Loader2, Star, IndianRupee, FileText, ChevronLeft, Folder, ChevronRight, CheckCircle2 } from 'lucide-react';

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
  const [view, setView] = useState<'default' | 'free-tests'>('default');
  const [showPremiumOnDashboard, setShowPremiumOnDashboard] = useState(false);
  const navigate = useNavigate();

  const formatScore = (val: number | null | undefined, totalQuestions: number) => {
    if (val === undefined || val === null) return '0';
    const isScaled = val > totalQuestions * 3 || val < 0;
    const score = isScaled ? val / 100 : val;
    return score % 1 === 0 ? score.toString() : score.toFixed(2);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [testsRes, perfRes] = await Promise.all([
          listMockTests(),
          userId ? getUserPerformance(userId) : Promise.resolve(null),
        ]);
        const allTests: MockTest[] = testsRes.tests || [];
        setTests(allTests.filter(t => t.is_active && t.title !== '_SUBJECT_PLACEHOLDER_'));
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
  const firstFreeTest = tests.find(t => t.is_free);

  const paidTests = tests.filter(t => !t.is_free && t.title !== '_SUBJECT_PLACEHOLDER_').sort((a, b) => a.id - b.id);
  const first6TestIds = paidTests.slice(0, 6).map(t => t.id);

  const getTestStatus = (test: MockTest): 'free' | 'unlocked' | 'paid' => {
    if (test.is_free) return 'free';
    if (accessList.includes(test.id) || 
        accessList.includes(-1) || 
        (accessList.includes(-2) && first6TestIds.includes(test.id))) {
      return 'unlocked';
    }
    return 'paid';
  };

  const RELEASE_DATES = [
    { paper: 'Paper 1', date: '19/06/2026' },
    { paper: 'Paper 2', date: '22/06/2026' },
    { paper: 'Paper 3', date: '25/06/2026' },
    { paper: 'Paper 4', date: '28/06/2026' },
    { paper: 'Paper 5', date: '01/07/2026' },
    { paper: 'Paper 6', date: '04/07/2026' },
    { paper: 'Paper 7', date: '07/07/2026' },
    { paper: 'Paper 8', date: '10/07/2026' },
    { paper: 'Paper 9', date: '13/07/2026' },
    { paper: 'Paper 10', date: '16/07/2026' },
    { paper: 'Paper 11', date: '20/07/2026' },
    { paper: 'Paper 12', date: '23/07/2026' }
  ];

  const checkReleased = (dateStr: string) => {
    const [d, m, y] = dateStr.split('/').map(Number);
    const targetDate = new Date(y, m - 1, d);
    const today = new Date();
    return today >= targetDate;
  };

  const formatDateLabel = (dateStr: string) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [d, m, y] = dateStr.split('/').map(Number);
    return `${d} ${months[m - 1]} ${y}`;
  };

  const hasTestAccess = (testId: number) => {
    return accessList.includes(-1) || 
           (accessList.includes(-2) && first6TestIds.includes(testId)) || 
           accessList.includes(testId);
  };

  const isSubjectUnlocked = (category: string) => {
    const subjectPapers = tests.filter((t: any) => t.category === category && t.title !== '_SUBJECT_PLACEHOLDER_');
    if (subjectPapers.length === 0) return false;
    return subjectPapers.every((p: any) => hasTestAccess(p.id));
  };

  const isSubjectPartiallyUnlocked = (category: string) => {
    const subjectPapers = tests.filter((t: any) => t.category === category && t.title !== '_SUBJECT_PLACEHOLDER_');
    if (subjectPapers.length === 0) return false;
    const unlockedCount = subjectPapers.filter((p: any) => hasTestAccess(p.id)).length;
    return unlockedCount > 0 && unlockedCount < subjectPapers.length;
  };

  const subjectsMap: Record<string, { category: string; price: number; papers: MockTest[] }> = {};
  tests.forEach(test => {
    if (!test.is_free) {
      if (!subjectsMap[test.category]) {
        subjectsMap[test.category] = { category: test.category, price: test.price, papers: [] };
      }
      subjectsMap[test.category].papers.push(test);
    }
  });
  const paidSubjects = Object.values(subjectsMap);

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
              Last score: <span className="font-semibold text-foreground">{formatScore(attempt.score, (attempt as any).total_questions)}</span>
            </div>
          )}

          <div className="mt-auto pt-2">
            {status === 'paid' ? (
              <Button 
                onClick={() => {
                  if (!userId) onRequireAuth?.();
                  else navigate({ to: '/ao/aao/premium', search: { show_pricing: true } as any });
                }}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer" 
                size="sm"
              >
                <Lock className="w-3.5 h-3.5 mr-2" />Unlock Paper
              </Button>
            ) : (
              <Button 
                className="w-full gradient-primary" 
                size="sm"
                onClick={() => {
                  if (!userId) onRequireAuth?.();
                  else navigate({ to: `/ao/aao/test/${test.id}` as any });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── FREE TESTS VIEW ──────────────────────────────────────
  if (view === 'free-tests') {
    const freeTests = tests.filter(t => t.is_free);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setView('default')}
            className="cursor-pointer hover:bg-muted"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Free Practice Papers</h1>
            <p className="text-sm text-muted-foreground">Select any of the free papers below to begin practicing</p>
          </div>
        </div>

        {freeTests.length === 0 ? (
          <div className="text-center py-16 bg-muted/20 border border-dashed border-border rounded-2xl">
            <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-muted-foreground font-medium">No free practice tests are currently available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {freeTests.map(test => {
              const attempt = (performance?.submissions || []).find(s => (s as any).test_id === test.id);
              return (
                <Card key={test.id} className="flex flex-col overflow-hidden border-border hover:shadow-elegant transition-all group">
                  <div
                    className="h-32 relative flex items-end p-4 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent"
                    style={{ backgroundImage: test.image_url ? `url(${test.image_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/60" />
                    <div className="relative flex items-center justify-between w-full">
                      <Badge className="text-[10px] px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm">
                        Free Test
                      </Badge>
                      <Badge className="text-[10px] px-2 py-0.5" style={{ backgroundColor: CATEGORY_COLORS[test.category] || '#16a34a', color: '#fff' }}>
                        {test.category}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <h3 className="font-bold text-lg leading-snug">{test.title}</h3>
                    {test.description && <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{test.description}</p>}

                    {attempt && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        Last Score: <span className="font-semibold text-foreground">{formatScore(attempt.score, (attempt as any).total_questions)}</span>
                      </div>
                    )}

                    <div className="mt-auto pt-3">
                      <Button 
                        className="w-full gradient-primary font-bold cursor-pointer" 
                        onClick={() => {
                          if (!userId) onRequireAuth?.();
                          else navigate({ to: `/ao/aao/test/${test.id}` as any });
                        }}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Start Test
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const accessibleTests = accessList.includes(-1) ? tests : tests.filter(t => getTestStatus(t) === 'free' || getTestStatus(t) === 'unlocked');

  const stats = [
    { icon: BookOpen, label: 'Tests Available', value: accessibleTests.length, color: 'text-blue-600', bgColor: 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-100/50 dark:border-blue-900/30' },
    { icon: FileText, label: 'Attempts', value: performance?.totalAttempts ?? 0, color: 'text-green-600', bgColor: 'bg-green-50/80 dark:bg-green-950/40 border-green-100/50 dark:border-green-900/30' },
    { icon: Trophy, label: 'Total Questions', value: `${accessibleTests.reduce((acc, t) => acc + (t.total_questions ?? 0), 0)}`, color: 'text-purple-600', bgColor: 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-100/50 dark:border-purple-900/30' },
  ];

  // ── DEFAULT VIEW (DASHBOARD CARDS) ──────────────────────
  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {stats.map(({ icon: Icon, label, value, color, bgColor }) => (
          <Card key={label} className="group p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-2 sm:gap-4 border-border hover:shadow-soft transition-all duration-300">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border group-hover:scale-105 transition-transform duration-300 ${bgColor} ${color}`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight sm:truncate">{label}</p>
              <p className="text-sm sm:text-xl font-extrabold mt-0.5 sm:mt-1 leading-none">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Side-by-side Cards */}
      {/* Side-by-side Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {/* Free Access Card */}
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 flex flex-col justify-between gap-3 sm:gap-4 overflow-hidden relative group">
          <div className="absolute right-0 bottom-0 w-24 h-24 sm:w-32 sm:h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mb-6 sm:-mr-8 sm:-mb-8 pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700" />
          <div className="space-y-1 sm:space-y-2 relative z-10 w-full">
            <h2 className="text-sm sm:text-xl font-extrabold text-emerald-950 flex items-center gap-1.5 sm:gap-2 leading-tight">
              <Unlock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
              <span>Free Practice Papers</span>
            </h2>
            <p className="text-[11px] sm:text-sm text-emerald-800/80 leading-snug sm:leading-relaxed line-clamp-3 sm:line-clamp-none">
              Start practicing immediately with our selection of free mock papers. Practice general agriculture and agronomy papers with no commitment.
            </p>
          </div>
          <div className="relative z-10 pt-1 sm:pt-2 w-full">
            <Button 
              onClick={() => setView('free-tests')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 px-3 py-2 text-xs sm:px-6 sm:py-2.5 sm:text-sm rounded-lg sm:rounded-xl w-full cursor-pointer transition-all duration-200"
            >
              Start Free Papers
            </Button>
          </div>
        </Card>

        {/* Premium Access Card */}
        <Card className={`p-4 sm:p-6 flex flex-col justify-between gap-3 sm:gap-4 overflow-hidden relative group transition-all duration-300 ${
          accessList.includes(-1) 
            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200' 
            : accessList.includes(-2)
              ? 'bg-gradient-to-br from-emerald-50/70 to-blue-50/50 border-emerald-200'
              : 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200'
        }`}>
          <div className={`absolute right-0 bottom-0 w-24 h-24 sm:w-32 sm:h-32 rounded-full blur-2xl -mr-6 -mb-6 sm:-mr-8 sm:-mb-8 pointer-events-none transition-all duration-700 ${
            accessList.includes(-1) || accessList.includes(-2)
              ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20'
              : 'bg-amber-500/10 group-hover:bg-amber-500/20'
          }`} />
          <div className="space-y-1 sm:space-y-2 relative z-10 w-full">
            <h2 className={`text-sm sm:text-xl font-extrabold flex items-center gap-1.5 sm:gap-2 leading-tight ${
              accessList.includes(-1) || accessList.includes(-2) ? 'text-emerald-950' : 'text-amber-950'
            }`}>
              {accessList.includes(-1) ? (
                <><Unlock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" /> <span>Open All Papers</span></>
              ) : accessList.includes(-2) ? (
                <><Unlock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" /> <span>Premium Active</span></>
              ) : (
                <><Lock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" /> <span>Get Full Access</span></>
              )}
            </h2>
            <p className={`text-[11px] sm:text-sm leading-snug sm:leading-relaxed line-clamp-3 sm:line-clamp-none ${
              accessList.includes(-1) || accessList.includes(-2) ? 'text-emerald-800/80' : 'text-amber-800/80'
            }`}>
              {accessList.includes(-1) 
                ? "You have full unrestricted access to all premium tests, previous years' papers, and detailed performance insights." 
                : accessList.includes(-2)
                  ? "You have unlocked the first 6 mock test sets (18 papers). Access them on the premium page or upgrade to unlock all 36 papers."
                  : "Unlock all 36 premium mock tests, high-yield practice questions, and detailed analytics designed by agricultural specialists."}
            </p>
          </div>
          <div className="relative z-10 pt-1 sm:pt-2 w-full">
            {accessList.includes(-1) ? (
              <Button 
                onClick={() => navigate({ to: '/ao/aao/premium' })} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 px-3 py-2 text-xs sm:px-6 sm:py-2.5 sm:text-sm rounded-lg sm:rounded-xl w-full cursor-pointer transition-all duration-200"
              >
                Open All Papers
              </Button>
            ) : accessList.includes(-2) ? (
              <div className="flex flex-col lg:flex-row gap-1.5 sm:gap-2">
                <Button 
                  onClick={() => navigate({ to: '/ao/aao/premium' })} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md px-2 py-2 text-xs sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl flex-1 cursor-pointer"
                >
                  Open Papers
                </Button>
                <Button 
                  onClick={() => navigate({ to: '/ao/aao/premium', search: { show_pricing: true } as any })} 
                  className="bg-amber-600 hover:bg-amber-700 text-white shadow-md px-2 py-2 text-xs sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl flex-1 cursor-pointer"
                >
                  Upgrade
                </Button>
              </div>
            ) : pendingPayment ? (
              <Button 
                onClick={() => navigate({ to: '/ao/aao/checkout' })} 
                className="bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 px-3 py-2 text-xs sm:px-6 sm:py-2.5 sm:text-sm rounded-lg sm:rounded-xl w-full cursor-pointer"
              >
                Verify Payment
              </Button>
            ) : (
              <Button 
                onClick={() => {
                  if (!userId) onRequireAuth?.();
                  else navigate({ to: '/ao/aao/premium', search: { show_pricing: true } as any });
                }} 
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 px-3 py-2 text-xs sm:px-6 sm:py-2.5 sm:text-sm rounded-lg sm:rounded-xl w-full cursor-pointer"
              >
                Unlock Access
              </Button>
            )}
          </div>
        </Card>
      </div>

      {(accessList.includes(-1) || accessList.includes(-2)) && (
        <div className="space-y-6 pt-4 animate-in fade-in duration-500">
          <Card className="p-6 border border-slate-200 shadow-sm bg-white rounded-2xl space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 font-serif text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" /> Papers Release Calendar
              </h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                12 Dates · 36 Papers
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {RELEASE_DATES.map((item) => {
                const isReleased = checkReleased(item.date);
                return (
                  <div 
                    key={item.paper} 
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-300 ${
                      isReleased 
                        ? 'border-emerald-100 bg-emerald-50/45 text-emerald-950 shadow-sm' 
                        : 'border-slate-100 bg-slate-50/50 text-slate-505'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[9px] uppercase font-extrabold tracking-wider opacity-65">{item.paper}</span>
                      {isReleased ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Lock className="w-3 h-3 text-slate-300 shrink-0" />
                      )}
                    </div>
                    <div className="font-bold text-sm tracking-tight text-slate-800">{formatDateLabel(item.date)}</div>
                    <div className="text-[10px] mt-1 font-semibold">
                      {isReleased ? (
                        <span className="text-emerald-700">Available Now</span>
                      ) : (
                        <span className="text-slate-400">Scheduled</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
