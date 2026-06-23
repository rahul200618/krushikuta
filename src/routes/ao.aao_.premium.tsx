import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { listMockTests, checkUserAccess, getUserPerformance, debugUserAccess, getProfile } from '@/lib/exam-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2, ChevronRight, Calendar, Lock, Unlock, CheckCircle2, Sparkles, ArrowRight, X, BookOpen } from 'lucide-react';
import { ExamAuthModal } from '@/components/exam/ExamAuthModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

export const Route = createFileRoute('/ao/aao_/premium')({
  component: PremiumSchedulePage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      show_pricing: search.show_pricing === true || search.show_pricing === 'true',
      subject: typeof search.subject === 'string' ? search.subject : undefined,
    };
  },
  head: () => ({
    meta: [{ title: 'Premium Schedule — Krishikuta' }],
  }),
});

function PremiumSchedulePage() {
  const navigate = useNavigate();
  const { show_pricing, subject: selectedSubjectName } = Route.useSearch();
  const [tests, setTests] = useState<any[]>([]);
  const [accessList, setAccessList] = useState<number[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(undefined);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPricing, setShowPricing] = useState<boolean | null>(null); // null = not yet determined
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pendingCheckoutPkg, setPendingCheckoutPkg] = useState<'six_papers' | 'all_papers' | null>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

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

  const paidTests = tests.filter((t: any) => !t.is_free && t.title !== '_SUBJECT_PLACEHOLDER_').sort((a, b) => a.id - b.id);
  const first6TestIds = paidTests.slice(0, 6).map(t => t.id);

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (session === undefined) return;
      setLoading(true);
      try {
        const testsRes = await listMockTests();
        const allTests = testsRes.tests || [];
        
        setTests(allTests.filter((t: any) => t.is_active && !t.is_free && t.title !== '_SUBJECT_PLACEHOLDER_'));

        if (session?.user?.id) {
          const userId = session.user.id;
          let userEmail = session.user.email;

          if (!userEmail) {
            try {
              const profRes = await getProfile(userId);
              if (profRes?.profile?.email) {
                userEmail = profRes.profile.email;
              }
            } catch (e) {
              console.error('[PremiumSchedulePage] Error fetching profile for email fallback:', e);
            }
          }

          // Query user_purchases directly with user's own session (bypasses RLS correctly)
          const { data: purchaseRows, error: purchaseErr } = await supabase
            .from('user_purchases')
            .select('mock_test_id')
            .eq('user_id', userId)
            .eq('status', 'active');

          if (purchaseErr) {
            console.error('[PremiumSchedulePage] Error checking purchases by user_id:', purchaseErr);
          }

          let currentAccess = (purchaseRows || []).map((r: any) => r.mock_test_id);

          // Fallback: query backend API to check by email and backfill (bypasses RLS)
          if (currentAccess.length === 0 && userEmail) {
            console.log('[PremiumSchedulePage] Direct access list empty. Querying backend by email:', userEmail);
            try {
              const res = await checkUserAccess(userId, [], userEmail);
              if (res && res.access && res.access.length > 0) {
                currentAccess = res.access;
                console.log('[PremiumSchedulePage] Backend check-user-access found purchases by email:', currentAccess);
              }
            } catch (e) {
              console.error('[PremiumSchedulePage] Failed to check user access via backend API:', e);
            }
          }

          console.log('[ACCESS] userId:', userId, 'email:', userEmail, 'access:', currentAccess);

          setAccessList(currentAccess);
          const hasPremium = currentAccess.includes(-1) || currentAccess.includes(-2);
          setHasAccess(currentAccess.includes(-1));
          setShowPricing(!hasPremium);

          const perfRes = await getUserPerformance(userId).catch(() => null);
          setPerformance(perfRes);
        } else {
          setAccessList([]);
          setHasAccess(false);
          setPerformance(null);
          setShowPricing(true); 
        }
      } catch (err) {
        console.error('[PremiumSchedulePage] General load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session, show_pricing]);

  useEffect(() => {
    if (!loading && showPricing === true && show_pricing) {
      const timer = setTimeout(() => {
        pricingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, showPricing, show_pricing]);

  const handleActionClick = (test: any) => {
    if (hasTestAccess(test.id)) {
      navigate({ to: `/ao/aao/test/${test.id}` as any });
    } else {
      setShowPricingModal(true);
      if (!session) {
        toast.info("Please log in or register to unlock premium test papers.");
      }
    }
  };

  const handleUnlockClick = () => {
    setShowPricingModal(true);
    if (!session) {
      toast.info("Please log in or register to unlock premium test papers.");
    }
  };

  const parseSchedule = (test: any) => {
    try {
      if (test.popup_message && test.popup_message.startsWith('{')) {
        return JSON.parse(test.popup_message);
      }
    } catch { }
    return { released_date: '-', releasing_date: '-', status: 'UPCOMING' };
  };

  const subjectsMap: Record<string, { category: string; price: number; papers: any[] }> = {};
  tests.forEach(test => {
    if (!subjectsMap[test.category]) {
      subjectsMap[test.category] = { category: test.category, price: test.price, papers: [] };
    }
    subjectsMap[test.category].papers.push(test);
  });
  const paidSubjects = Object.values(subjectsMap).sort((a, b) => a.category.localeCompare(b.category));
  paidSubjects.forEach(sub => {
    sub.papers.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
  });

  const renderSubjectDetailView = (subjectName: string) => {
    const subject = paidSubjects.find(s => s.category === subjectName);
    if (!subject) {
      return (
        <Card className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
          <p className="text-slate-500 font-medium text-sm">Subject not found.</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate({ to: '/ao/aao/premium', search: { show_pricing } as any })}
            className="mt-4 rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to All Subjects
          </Button>
        </Card>
      );
    }

    const isUnlocked = isSubjectUnlocked(subject.category);
    const isPartiallyUnlocked = isSubjectPartiallyUnlocked(subject.category);

    return (
      <div className="space-y-4">
        {/* Subject Header Card */}
        <div className={`rounded-2xl p-4 sm:p-5 border bg-gradient-to-br ${
          isUnlocked
            ? 'from-emerald-50 to-teal-50/40 border-emerald-200/60'
            : isPartiallyUnlocked
            ? 'from-blue-50 to-indigo-50/40 border-blue-200/60'
            : 'from-amber-50 to-orange-50/40 border-amber-200/60'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-serif leading-snug">{subject.category}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {subject.papers.length} {subject.papers.length === 1 ? 'Mock Test Paper' : 'Mock Test Papers'} available
              </p>
            </div>
            <div className="shrink-0">
              {isUnlocked ? (
                <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold py-1 px-2.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full" /> Unlocked
                </span>
              ) : isPartiallyUnlocked ? (
                <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold py-1 px-2.5 rounded-full">
                  Partial Access
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-[10px] font-bold py-1 px-2.5 rounded-full">
                  <Lock className="w-2.5 h-2.5" /> ₹{subject.price}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Papers List — mobile-first cards */}
        {subject.papers.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-dashed">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            No papers are currently scheduled for this subject.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {subject.papers.map((paper) => {
              const sched = parseSchedule(paper);
              const isReleased = sched.status === 'RELEASED';
              const attempt = (performance?.submissions || []).find((s: any) => s.test_id === paper.id);
              const canAccess = hasTestAccess(paper.id);
              const actionLabel = canAccess ? (attempt ? 'Retake' : 'Start Test') : 'Unlock';

              return (
                <div
                  key={paper.id}
                  className={`rounded-2xl border transition-all duration-200 ${
                    isReleased
                      ? 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md shadow-sm'
                      : 'bg-slate-50/60 border-slate-100'
                  }`}
                >
                  <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <p className={`font-bold text-sm leading-snug flex-1 min-w-0 ${
                      isReleased ? 'text-slate-900' : 'text-slate-400'
                    }`}>
                      {paper.title}
                    </p>
                    <Button
                      size="sm"
                      disabled={!isReleased}
                      onClick={() => handleActionClick(paper)}
                      className={`shrink-0 h-8 px-4 rounded-xl text-xs font-bold transition-all ${
                        isReleased
                          ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/20 text-white cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isReleased ? actionLabel : 'Soon'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Locked Promo */}
        {!isUnlocked && (
          <div className="p-5 bg-amber-50 border border-amber-200/60 rounded-2xl space-y-3 text-center">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Unlock All Papers</h4>
              <p className="text-xs text-amber-700/80 mt-1 max-w-xs mx-auto">
                Select a premium plan to access all mock test papers in <span className="font-semibold">{subject.category}</span>.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setShowPricing(true);
                setTimeout(() => {
                  pricingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-6 h-9 rounded-xl font-bold cursor-pointer w-full sm:w-auto"
            >
              View Pricing Plans
            </Button>
          </div>
        )}
      </div>
    );
  };

    return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (selectedSubjectName) {
                navigate({ to: '/ao/aao/premium', search: { show_pricing } as any });
              } else {
                navigate({ to: '/ao/aao' });
              }
            }} 
            className="rounded-full animate-in fade-in duration-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> {selectedSubjectName ? 'Back to All Subjects' : 'Back to Dashboard'}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-24 bg-white rounded-2xl border">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : selectedSubjectName ? (
          <div className="animate-in fade-in duration-300">
            {renderSubjectDetailView(selectedSubjectName)}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {showPricing === true && (
              <div ref={pricingRef} className="animate-in fade-in slide-in-from-top-4 duration-300">
                <Card className="p-6 border-2 border-emerald-600/30 bg-emerald-50/15 rounded-2xl space-y-4 shadow-md relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" /> Select Premium Plan
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Choose a package to unlock premium test papers</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    <Card className={`p-5 border bg-white rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:shadow-soft transition-all duration-300 ${
                      accessList.includes(-2) || accessList.includes(-1)
                        ? 'border-emerald-200 bg-emerald-50/10 opacity-90'
                        : 'border-slate-200 hover:border-emerald-500'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-800 text-base">First 6 Paper Releases</h4>
                          {(accessList.includes(-2) || accessList.includes(-1)) && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[9px]">Owned</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Get immediate unlock access to the first 6 premium mock test sets (18 papers total).</p>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-emerald-700">₹2,799</span>
                        <span className="text-xs line-through text-slate-400">₹4,000</span>
                      </div>
                      {accessList.includes(-2) || accessList.includes(-1) ? (
                        <Button 
                          disabled
                          className="w-full bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs py-5 h-auto flex items-center justify-center gap-1.5 border-none"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Unlocked & Active</span>
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => {
                            if (!session) {
                              setPendingCheckoutPkg('six_papers');
                              setShowAuthModal(true);
                            } else {
                              navigate({ to: '/ao/aao/checkout', search: { package: 'six_papers' } as any });
                            }
                          }}
                          className="w-full bg-[#2c5f34] hover:bg-[#1a3820] text-white font-bold rounded-xl text-xs py-5 h-auto flex items-center justify-center gap-1.5 cursor-pointer shadow-soft transition-all"
                        >
                          <span>Unlock First 6 Releases (18 Papers)</span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      )}
                    </Card>

                    <Card className={`p-5 border bg-white rounded-2xl flex flex-col justify-between gap-3 shadow-md transition-all duration-300 relative overflow-hidden ${
                      accessList.includes(-1)
                        ? 'border-emerald-250 bg-emerald-50/10 opacity-90'
                        : 'border-2 border-emerald-600 hover:border-emerald-700 hover:shadow-elegant'
                    }`}>
                      {accessList.includes(-1) ? (
                        <div className="absolute right-0 top-0 bg-emerald-600 text-white text-[9px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-bl-xl">
                          Owned
                        </div>
                      ) : (
                        <div className="absolute right-0 top-0 bg-emerald-600 text-white text-[9px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-bl-xl">
                          Recommended
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-800 text-base pr-12">All-Access Premium Bundle</h4>
                        <p className="text-xs text-slate-500 mt-1">Get absolute lifetime access to all 12 mock test sets (36 papers total) including all future releases.</p>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-emerald-700">₹4,799</span>
                        <span className="text-xs line-through text-slate-400">₹6,000</span>
                      </div>
                      {accessList.includes(-1) ? (
                        <Button 
                          disabled
                          className="w-full bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs py-5 h-auto flex items-center justify-center gap-1.5 border-none"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Unlocked & Active</span>
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => {
                            if (!session) {
                              setPendingCheckoutPkg('all_papers');
                              setShowAuthModal(true);
                            } else {
                              navigate({ to: '/ao/aao/checkout', search: { package: 'all_papers' } as any });
                            }
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs py-5 h-auto flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_16px_rgba(16,185,129,0.25)] transition-all"
                        >
                          <Sparkles className="w-4 h-4 text-emerald-200" />
                          <span>{accessList.includes(-2) ? 'Upgrade to All 12 Releases (36 Papers)' : 'Unlock All 12 Releases (36 Papers)'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      )}
                    </Card>
                  </div>
                </Card>
              </div>
            )}
            <div className="space-y-4">
              <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 mb-2">
                <h2 className="font-extrabold text-slate-900 font-serif text-xl sm:text-2xl flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                  Premium Mock Test Series
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/50">
                    {paidSubjects.length} subjects
                  </span>
                  <span>available for premium preparation</span>
                </div>
              </div>

              {paidSubjects.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
                  No premium subjects available yet.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {paidSubjects.map((subject) => {
                    const isUnlocked = isSubjectUnlocked(subject.category) || isSubjectPartiallyUnlocked(subject.category);
                    
                    const handleCardClick = () => {
                      if (isUnlocked) {
                        navigate({ to: '/ao/aao/premium', search: { show_pricing, subject: subject.category } as any });
                      } else {
                        setShowPricingModal(true);
                        if (!session) {
                          toast.info("Please log in or register to unlock premium test papers.");
                        } else {
                          toast.info(`Please select a premium plan below to unlock "${subject.category}" papers.`);
                        }
                      }
                    };

                    return (
                      <div 
                        key={subject.category} 
                        onClick={handleCardClick}
                        className={`group rounded-2xl shadow-sm border hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer px-4 py-3.5 flex items-center justify-between gap-3 bg-gradient-to-br ${
                          isUnlocked
                            ? 'from-white via-white to-emerald-50/20 border-emerald-100 hover:border-emerald-300'
                            : 'from-white via-white to-slate-50/30 border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        {/* Left: name + paper count */}
                        <div className="min-w-0 flex-1">
                          <h3 className={`font-extrabold text-sm font-serif leading-snug truncate transition-colors ${
                            isUnlocked ? 'text-emerald-900 group-hover:text-emerald-700' : 'text-slate-800 group-hover:text-slate-900'
                          }`}>{subject.category}</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isUnlocked ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                            {subject.papers.length} {subject.papers.length === 1 ? 'Paper' : 'Papers'}
                          </p>
                        </div>

                        {/* Right: small pill button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
                          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                            isUnlocked
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-emerald-600/30 hover:shadow-md'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {!isUnlocked && <Lock className="w-3 h-3" />}
                          <span>{isUnlocked ? 'Open' : 'Unlock'}</span>
                          {isUnlocked && <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {showAuthModal && (
        <ExamAuthModal 
          isOpen={showAuthModal} 
          onClose={() => {
            setShowAuthModal(false);
            setPendingCheckoutPkg(null);
          }} 
          onSuccess={() => {
            setShowAuthModal(false);
            if (pendingCheckoutPkg) {
              const pkg = pendingCheckoutPkg;
              setPendingCheckoutPkg(null);
              navigate({ to: '/ao/aao/checkout', search: { package: pkg } as any });
            }
          }} 
        />
      )}

      <Dialog open={showPricingModal} onOpenChange={setShowPricingModal}>
        <DialogContent className="max-w-3xl p-6 rounded-2xl border border-slate-100 bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-serif text-slate-800 font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" /> Select Premium Plan
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Choose a package to unlock premium test papers
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4 pt-2">
            <Card className={`p-5 border bg-white rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:shadow-soft transition-all duration-300 ${
              accessList.includes(-2) || accessList.includes(-1)
                ? 'border-emerald-200 bg-emerald-50/10 opacity-90'
                : 'border-slate-200 hover:border-emerald-500'
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-base">First 6 Paper Releases</h4>
                  {(accessList.includes(-2) || accessList.includes(-1)) && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[9px]">Owned</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">Get immediate unlock access to the first 6 premium mock test sets (18 papers total).</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-emerald-700">₹2,799</span>
                <span className="text-xs line-through text-slate-400">₹4,000</span>
              </div>
              {accessList.includes(-2) || accessList.includes(-1) ? (
                <Button 
                  disabled
                  className="w-full bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs py-5 h-auto flex items-center justify-center gap-1.5 border-none"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Unlocked & Active</span>
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    setShowPricingModal(false);
                    if (!session) {
                      setPendingCheckoutPkg('six_papers');
                      setShowAuthModal(true);
                    } else {
                      navigate({ to: '/ao/aao/checkout', search: { package: 'six_papers' } as any });
                    }
                  }}
                  className="w-full bg-[#2c5f34] hover:bg-[#1a3820] text-white font-bold rounded-xl text-xs py-5 h-auto flex items-center justify-center gap-1.5 cursor-pointer shadow-soft transition-all"
                >
                  <span>Unlock First 6 Releases (18 Papers)</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </Card>

            <Card className={`p-5 border bg-white rounded-2xl flex flex-col justify-between gap-3 shadow-md transition-all duration-300 relative overflow-hidden ${
              accessList.includes(-1)
                ? 'border-emerald-250 bg-emerald-50/10 opacity-90'
                : 'border-2 border-emerald-600 hover:border-emerald-700 hover:shadow-elegant'
            }`}>
              {accessList.includes(-1) ? (
                <div className="absolute right-0 top-0 bg-emerald-600 text-white text-[9px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-bl-xl">
                  Owned
                </div>
              ) : (
                <div className="absolute right-0 top-0 bg-emerald-600 text-white text-[9px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-bl-xl">
                  Recommended
                </div>
              )}
              <div>
                <h4 className="font-bold text-slate-800 text-base pr-12">All-Access Premium Bundle</h4>
                <p className="text-xs text-slate-500 mt-1">Get absolute lifetime access to all 12 mock test sets (36 papers total) including all future releases.</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-emerald-700">₹4,799</span>
                <span className="text-xs line-through text-slate-400">₹6,000</span>
              </div>
              {accessList.includes(-1) ? (
                <Button 
                  disabled
                  className="w-full bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs py-5 h-auto flex items-center justify-center gap-1.5 border-none"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Unlocked & Active</span>
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    setShowPricingModal(false);
                    if (!session) {
                      setPendingCheckoutPkg('all_papers');
                      setShowAuthModal(true);
                    } else {
                      navigate({ to: '/ao/aao/checkout', search: { package: 'all_papers' } as any });
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs py-5 h-auto flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_16px_rgba(16,185,129,0.25)] transition-all"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>{accessList.includes(-2) ? 'Upgrade to All 12 Releases (36 Papers)' : 'Unlock All 12 Releases (36 Papers)'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-2xl p-6 rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-2xl">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 -mx-6 -mt-6 rounded-t-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm shadow-inner">
                <Calendar className="w-6 h-6 text-emerald-100" />
              </div>
              <div>
                <DialogTitle className="text-xl font-serif text-white font-bold leading-tight">Premium Papers Release Calendar</DialogTitle>
                <DialogDescription className="text-emerald-100/80 text-xs mt-1">
                  Unlock all current and upcoming papers immediately. Get instant access to full sets of exam preparation materials.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="my-6">
            <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3">Releasing Schedule</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {RELEASE_DATES.map((item) => {
                const isReleased = checkReleased(item.date);
                return (
                  <div key={item.paper} className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-300 ${
                    isReleased 
                      ? 'border-emerald-100 bg-emerald-50/50 text-emerald-950 shadow-sm' 
                      : 'border-slate-100 bg-slate-50/50 text-slate-600'
                  }`}>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">{item.paper}</span>
                      {isReleased ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </div>
                    <div className="font-bold text-sm tracking-tight">{formatDateLabel(item.date)}</div>
                    <div className="text-[10px] mt-1 opacity-70">
                      {isReleased ? 'Available Now' : 'Scheduled'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center justify-center gap-3 border-t border-slate-100 pt-5">
            <Button 
              onClick={() => {
                setShowScheduleModal(false);
                navigate({ to: '/ao/aao/checkout', search: { package: 'all_papers' } as any });
              }}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-6 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group text-base"
            >
              <Sparkles className="w-5 h-5 animate-pulse text-emerald-200 group-hover:scale-110 transition-transform" />
              <span>Access All Papers</span>
              <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              140+ mock tests across 20+ subjects included
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
