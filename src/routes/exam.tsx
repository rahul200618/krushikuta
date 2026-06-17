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
    let active = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        if (data.session) {
          await fetchProfile(data.session.user.id);
        } else {
          setShowAuthModal(true);
          setLoadingAuth(false);
        }
      } catch (err) {
        console.error("Failed to initialize session:", err);
        if (active) {
          setShowAuthModal(true);
          setLoadingAuth(false);
        }
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      setSession(session);
      if (session) {
        setShowAuthModal(false);
        await fetchProfile(session.user.id);
      } else {
        setShowAuthModal(true);
        setLoadingAuth(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
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

  return (
    <div className="bg-background min-h-screen pb-12 pt-8">
      <div className="container-px mx-auto max-w-6xl">
        {/* Render auth modal globally for the page */}
        <ExamAuthModal open={showAuthModal} onOpenChange={setShowAuthModal} onSuccess={handleAuthSuccess} />
        
        <ExamDashboard 
          userId={session?.user?.id} 
          userEmail={session?.user?.email} 
          userProfile={userProfile} 
          onRequireAuth={() => setShowAuthModal(true)}
        />
      </div>
    </div>
  );

}
