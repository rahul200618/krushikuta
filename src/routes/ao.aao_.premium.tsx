import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { listMockTests, checkUserAccess, getUserPerformance } from '@/lib/exam-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2, BookOpen, Folder, ChevronRight, Calendar, Lock, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { ExamAuthModal } from '@/components/exam/ExamAuthModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export const Route = createFileRoute('/ao/aao_/premium')({
  component: PremiumSchedulePage,
  head: () => ({
    meta: [{ title: 'Premium Schedule — Krishikuta' }],
  }),
});

function PremiumSchedulePage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<any[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

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
        
        // Filter for active paid tests (not free and price > 0)
        setTests(allTests.filter((t: any) => t.is_active && !t.is_free && t.price > 0));

        if (session?.user?.id) {
          const [accessRes, perfRes] = await Promise.all([
            checkUserAccess(session.user.id, []),
            getUserPerformance(session.user.id).catch(() => null)
          ]);
          
          if (accessRes?.access && accessRes.access.includes(-1)) { // -1 represents premium bundle
            setHasAccess(true);
          } else {
            setHasAccess(false);
          }
          setPerformance(perfRes);
        } else {
          setHasAccess(false);
          setPerformance(null);
        }
      } catch { } finally {
        setLoading(false);
      }
    };
    load();
  }, [session]);

  const handleActionClick = (test: any) => {
    if (!session) {
      setShowAuthModal(true);
      return;
    }
    if (hasAccess) {
      navigate({ to: `/ao/aao/test/${test.id}` as any });
    } else {
      setShowScheduleModal(true);
    }
  };

  const handleUnlockClick = () => {
    if (!session) {
      setShowAuthModal(true);
      return;
    }
    setShowScheduleModal(true);
  };

  const parseSchedule = (test: any) => {
    try {
      if (test.popup_message && test.popup_message.startsWith('{')) {
        return JSON.parse(test.popup_message);
      }
    } catch { }
    return { released_date: '-', releasing_date: '-', status: 'UPCOMING' };
  };

  // Group paid tests by category (Subject)
  const subjectsMap: Record<string, { category: string; price: number; papers: any[] }> = {};
  tests.forEach(test => {
    if (!subjectsMap[test.category]) {
      subjectsMap[test.category] = { category: test.category, price: test.price, papers: [] };
    }
    subjectsMap[test.category].papers.push(test);
  });
  const paidSubjects = Object.values(subjectsMap);

  // Auto-expand first subject if available
  useEffect(() => {
    if (paidSubjects.length > 0 && !expandedSubject) {
      setExpandedSubject(paidSubjects[0].category);
    }
  }, [paidSubjects]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Simple Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/ao/aao' })} className="rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        

        {/* Papers Release Schedule directly rendered */}
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

          {loading ? (
            <div className="flex justify-center items-center py-24 bg-white rounded-2xl border">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : paidSubjects.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
              No premium subjects available yet.
            </div>
          ) : (
            <div className="space-y-3">
              {paidSubjects.map((subject) => {
                const isOpen = expandedSubject === subject.category;
                return (
                  <div key={subject.category} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
                    {/* Subject Header */}
                    <div 
                      onClick={() => setExpandedSubject(isOpen ? null : subject.category)}
                      className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
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
                        {hasAccess ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs font-semibold py-1 px-3">
                            Unlocked
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-xs font-semibold py-1 px-3">
                            ₹{subject.price} Bundle
                          </Badge>
                        )}
                        <div className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Subject Papers Accordion Content */}
                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50/30 divide-y divide-slate-100">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100">
                              <tr>
                                <th className="px-6 py-4 font-semibold">PAPER TITLE</th>
                                <th className="px-6 py-4 font-semibold">RELEASE DATE</th>
                                <th className="px-6 py-4 font-semibold">STATUS</th>
                                <th className="px-6 py-4 font-semibold text-right">ACTION</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/80">
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
                                          {paper.description && <div className="text-[11px] text-slate-500 font-normal line-clamp-1 mt-0.5">{paper.description}</div>}
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
                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-5 py-1.5 h-8 text-xs font-semibold shadow-sm transition-all" 
                                            : "bg-slate-100 text-slate-400 hover:bg-slate-100 cursor-not-allowed rounded-md px-5 py-1.5 h-8 text-xs font-semibold"
                                        }
                                      >
                                        {hasAccess ? (attempt ? 'Retake' : 'Start') : 'Unlock'}
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {showAuthModal && <ExamAuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />}

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
