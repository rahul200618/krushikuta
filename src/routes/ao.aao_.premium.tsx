import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { listMockTests, checkUserAccess, getUserPerformance } from '@/lib/exam-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2, BookOpen, Folder, ChevronRight, Calendar, Lock, CheckCircle2, Sparkles, ArrowRight, X } from 'lucide-react';
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
  const [session, setSession] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
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
      setLoading(true);
      try {
        const testsRes = await listMockTests();
        const allTests = testsRes.tests || [];
        
        setTests(allTests.filter((t: any) => t.is_active && !t.is_free && t.title !== '_SUBJECT_PLACEHOLDER_'));

        if (session?.user?.id) {
          const [accessRes, perfRes] = await Promise.all([
            checkUserAccess(session.user.id, []),
            getUserPerformance(session.user.id).catch(() => null)
          ]);
          
          const currentAccess = accessRes?.access || [];
          setAccessList(currentAccess);
          
          const hasPremium = currentAccess.includes(-1) || currentAccess.includes(-2);
          if (currentAccess.includes(-1)) { 
            setHasAccess(true);
          } else {
            setHasAccess(false);
          }
          
          setShowPricing(!hasPremium || !!show_pricing);
          setPerformance(perfRes);
        } else {
          setAccessList([]);
          setHasAccess(false);
          setPerformance(null);
          setShowPricing(true); 
        }
      } catch { } finally {
        setLoading(false);
      }
    };
    load();
  }, [session, show_pricing]);

  useEffect(() => {
    if (showPricing && show_pricing) {
      const timer = setTimeout(() => {
        pricingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showPricing, show_pricing]);

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
  const paidSubjects = Object.values(subjectsMap);

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
      <Card className="p-6 border border-slate-200 shadow-soft bg-white rounded-2xl space-y-6">
        {/* Subject Detail Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate({ to: '/ao/aao/premium', search: { show_pricing } as any })}
              className="text-[#2c5f34] hover:text-[#1a3820] hover:bg-emerald-50 rounded-full h-8 pl-2 pr-3 -ml-2 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to All Subjects
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/30 flex items-center justify-center shrink-0">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 font-serif leading-none">{subject.category}</h2>
                <p className="text-xs text-slate-500 mt-2">{subject.papers.length} Mock Test Papers available</p>
              </div>
            </div>
          </div>

          <div className="self-start sm:self-center">
            {isUnlocked ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-50 text-xs font-semibold py-1.5 px-4 rounded-full">
                Full Access Unlocked
              </Badge>
            ) : isPartiallyUnlocked ? (
              <Badge className="bg-blue-50 text-blue-700 border-blue-250 hover:bg-blue-50 text-xs font-semibold py-1.5 px-4 rounded-full">
                Partially Unlocked
              </Badge>
            ) : (
              <Badge className="bg-amber-50 text-amber-750 border-amber-200 hover:bg-amber-50 text-xs font-semibold py-1.5 px-4 rounded-full">
                ₹{subject.price} All Access Bundle
              </Badge>
            )}
          </div>
        </div>

        {/* Papers List Table */}
        {subject.papers.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-slate-50/50 border border-dashed rounded-xl">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            No papers are currently scheduled for this subject.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold">PAPER TITLE</th>
                  <th className="px-6 py-4 font-bold">RELEASE DATE</th>
                  <th className="px-6 py-4 font-bold">STATUS</th>
                  <th className="px-6 py-4 font-bold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subject.papers.map((paper) => {
                  const sched = parseSchedule(paper);
                  const isReleased = sched.status === 'RELEASED';
                  const attempt = (performance?.submissions || []).find((s: any) => s.test_id === paper.id);
                  
                  return (
                    <tr key={paper.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <div className="text-slate-800 text-sm font-semibold">{paper.title}</div>
                            {paper.description && <div className="text-[11px] text-slate-500 font-normal line-clamp-2 mt-0.5">{paper.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {isReleased ? `Released: ${sched.released_date || '-'}` : `Releasing on: ${sched.releasing_date || '-'}`}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`text-[10px] font-bold border-0 ${isReleased ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {sched.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          size="sm"
                          disabled={!isReleased}
                          onClick={() => handleActionClick(paper)}
                          className={
                            isReleased 
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-1.5 h-8 text-xs font-semibold shadow-soft cursor-pointer transition-all" 
                              : "bg-slate-100 text-slate-400 hover:bg-slate-100 cursor-not-allowed rounded-xl px-5 py-1.5 h-8 text-xs font-semibold"
                          }
                        >
                          {hasTestAccess(paper.id) ? (attempt ? 'Retake' : 'Start') : 'Unlock'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Locked Promo */}
        {!isUnlocked && (
          <div className="p-5 bg-amber-50/40 border border-amber-100 rounded-xl space-y-2 mt-4 text-center">
            <h4 className="text-sm font-bold text-amber-900">Unlock All Papers in {subject.category}</h4>
            <p className="text-xs text-amber-800/80 max-w-lg mx-auto">
              This subject is part of the Premium Test Series. Select a package below to unlock all mock test papers.
            </p>
            <Button 
              size="sm" 
              onClick={() => {
                setShowPricing(true);
                setTimeout(() => {
                  pricingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-5 py-1.5 h-8 rounded-lg font-bold cursor-pointer"
            >
              View Pricing Plans
            </Button>
          </div>
        )}
      </Card>
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
            {showPricing && (
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

            <Card className="p-6 border border-slate-200 shadow-sm bg-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 font-serif text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" /> Papers Release Calendar
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
                          : 'border-slate-100 bg-slate-50/50 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[9px] uppercase font-extrabold tracking-wider opacity-65">{item.paper}</span>
                        {isReleased ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 animate-pulse" />
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

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-bold text-slate-800 font-serif text-xl">Premium Mock Test Series</h2>
                <p className="text-xs text-muted-foreground">{paidSubjects.length} subjects available</p>
              </div>

              {paidSubjects.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
                  No premium subjects available yet.
                </div>
              ) : (
                <div className="space-y-3">
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
                        className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-soft transition-all duration-300 cursor-pointer p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/30 flex items-center justify-center shrink-0">
                            <Folder className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-base md:text-lg font-serif">{subject.category}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{subject.papers.length} Mock Test Papers</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick();
                            }}
                            size="sm"
                            className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold h-8 rounded-full px-4 border shadow-sm transition-all"
                          >
                            Open
                          </Button>
                          <div className="text-slate-400">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
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
                navigate({ to: '/ao/aao/checkout' });
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
