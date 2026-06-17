import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { listMockTests, getUserPerformance } from '@/lib/exam-api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHero } from '@/components/site/PageHero';
import { Loader2, Clock, Unlock, Star, ArrowLeft } from 'lucide-react';
import { ExamAuthModal } from '@/components/exam/ExamAuthModal';

export const Route = createFileRoute('/exam_/free')({
  component: FreeExamsPage,
  head: () => ({
    meta: [{ title: 'Free Exams — Krishikuta' }],
  }),
});

const CATEGORY_COLORS: Record<string, string> = {
  'Practical Exam': '#16a34a',
  'General': '#2563eb',
  'AO/AAO': '#d97706',
  'ICAR': '#7c3aed',
};

function FreeExamsPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
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
        setTests(allTests.filter((t: any) => t.is_active && (t.is_free || t.price === 0)));

        if (session?.user?.id) {
          const perfRes = await getUserPerformance(session.user.id);
          setPerformance(perfRes);
        }
      } catch { } finally {
        setLoading(false);
      }
    };
    load();
  }, [session]);

  const renderTestCard = (test: any) => {
    const attempt = (performance?.submissions || []).find((s: any) => s.test_id === test.id);

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
            <Badge className="text-[10px] bg-emerald-500 text-white border-0 shadow-sm"><Unlock className="w-3 h-3 mr-1" />FREE</Badge>
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
            <Button 
              className="w-full gradient-primary" 
              size="sm"
              onClick={() => {
                if (!session) setShowAuthModal(true);
                else navigate({ to: `/exam-test/${test.id}` as any });
              }}
            >
              <Clock className="w-3.5 h-3.5 mr-2" />
              {attempt ? 'Retake Test' : 'Start Test'}
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHero 
        title="Free Mock Tests"
        description="Practice with our collection of free mock exams."
      />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Button variant="ghost" onClick={() => navigate({ to: '/exam' })} className="mb-8 -ml-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Exam Dashboard
        </Button>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map(renderTestCard)}
            {tests.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No free exams available at the moment.
              </div>
            )}
          </div>
        )}
      </div>
      {showAuthModal && <ExamAuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />}
    </div>
  );
}
