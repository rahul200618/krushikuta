import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { listMockTests, checkUserAccess } from '@/lib/exam-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, BookOpen } from 'lucide-react';
import { ExamAuthModal } from '@/components/exam/ExamAuthModal';

export const Route = createFileRoute('/exam_/premium')({
  component: PremiumSchedulePage,
  head: () => ({
    meta: [{ title: 'Premium Schedule — Krishikuta' }],
  }),
});

function PremiumSchedulePage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<any[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

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
        setTests(allTests.filter((t: any) => t.is_active && t.category === 'Premium Series'));

        if (session?.user?.id) {
          const { access } = await checkUserAccess(session.user.id, []);
          if (access && access.includes(-1)) { // -1 represents the premium bundle
            setHasAccess(true);
          }
        } else {
          setHasAccess(false);
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
      navigate({ to: `/exam-test/${test.id}` as any });
    } else {
      navigate({ to: '/exam-checkout' });
    }
  };

  const handleUnlockClick = () => {
    if (!session) {
      setShowAuthModal(true);
      return;
    }
    navigate({ to: '/exam-checkout' });
  };

  const parseSchedule = (test: any) => {
    try {
      if (test.popup_message && test.popup_message.startsWith('{')) {
        return JSON.parse(test.popup_message);
      }
    } catch { }
    return { released_date: '-', releasing_date: '-', status: 'UPCOMING' };
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Simple Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/exam' })} className="rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        
        {/* Banner */}
        {!hasAccess && (
          <div className="bg-emerald-50 rounded-2xl p-6 md:p-8 border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-500" />
            <div className="space-y-2 relative z-10">
              <div className="text-emerald-600 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                BEST VALUE DEAL
              </div>
              <h1 className="text-2xl md:text-3xl font-serif text-slate-800 leading-tight">less than 14rs per question paper</h1>
              <p className="text-sm text-slate-600 max-w-lg">Get complete access to all 20 subjects, 140+ mock tests at an unbeatable price.</p>
            </div>
            <Button onClick={handleUnlockClick} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all rounded-full px-8 py-6 text-sm font-semibold whitespace-nowrap relative z-10">
              Unlock Now for ₹3,000
            </Button>
          </div>
        )}

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 font-serif">Mock Test Series Release Schedule</h2>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold">SUBJECT</th>
                    <th className="px-6 py-4 font-semibold">RELEASED DATE</th>
                    <th className="px-6 py-4 font-semibold">RELEASING DATE</th>
                    <th className="px-6 py-4 font-semibold">STATUS</th>
                    <th className="px-6 py-4 font-semibold text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {tests.map((test) => {
                    const sched = parseSchedule(test);
                    const isReleased = sched.status === 'RELEASED';
                    
                    return (
                      <tr key={test.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          {test.title}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{sched.released_date || '-'}</td>
                        <td className="px-6 py-4 text-slate-600">{sched.releasing_date || '-'}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={`text-[10px] font-bold border-0 ${isReleased ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {sched.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            size="sm"
                            disabled={!isReleased}
                            onClick={() => handleActionClick(test)}
                            className={isReleased ? "bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-6 shadow-sm" : "bg-slate-100 text-slate-400 hover:bg-slate-100 cursor-not-allowed rounded-md px-6"}
                          >
                            Open
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {tests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No subjects available in the schedule yet. Add them from the admin dashboard!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      
      {showAuthModal && <ExamAuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />}
    </div>
  );
}
