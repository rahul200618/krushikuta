import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ExamDashboard } from "@/components/exam/ExamDashboard";
import { ExamAuthModal } from "@/components/exam/ExamAuthModal";
import { getProfile } from "@/lib/exam-api";
import { PageHero } from "@/components/site/PageHero";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/exam")({
  component: ExamPage,
  head: () => ({
    meta: [{ title: "Exam Portal — Krishikuta" }],
  }),
});

function ExamPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        fetchProfile(data.session.user.id);
      } else {
        setShowAuthModal(true);
        setLoadingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setShowAuthModal(false);
        fetchProfile(session.user.id);
      } else {
        setShowAuthModal(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const res = await getProfile(uid);
      setUserProfile(res.profile);
    } catch { } finally {
      setLoadingAuth(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your portal...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h2 className="text-2xl font-bold mb-2">Welcome to Krishikuta Exam Portal</h2>
        <p className="text-muted-foreground mb-6">Please sign in to access exams and track your performance.</p>
        <ExamAuthModal open={showAuthModal} onOpenChange={(open) => {
          setShowAuthModal(open);
          if (!open && !session) navigate({ to: "/" });
        }} onSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-12">
      <PageHero eyebrow="Student Portal" title="Exam Dashboard" description="Take exams, track your progress, and prepare for your agriculture exams." />
      
      <div className="container-px mx-auto max-w-6xl mt-8">
        <ExamDashboard 
          userId={session.user.id} 
          userEmail={session.user.email} 
          userProfile={userProfile} 
        />
      </div>
    </div>
  );
}
