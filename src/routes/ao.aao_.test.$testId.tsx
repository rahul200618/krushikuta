import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ExamTestInterface } from "@/components/exam/ExamTestInterface";
import { getProfile } from "@/lib/exam-api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/ao/aao_/test/$testId")({
  component: ActiveTestPage,
  head: () => ({
    meta: [{ title: "Active Exam — Krishikuta" }],
  }),
});

function ActiveTestPage() {
  const { testId } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error("Please sign in to take the test");
        navigate({ to: "/ao/aao" });
        return;
      }
      setSession(data.session);
      try {
        const res = await getProfile(data.session.user.id);
        setUserProfile(res.profile);
      } catch { } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Preparing your exam environment...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="bg-background min-h-screen">
      {/* We pass a fixed duration of 50 minutes (or customize later) */}
      <ExamTestInterface 
        testId={Number(testId)} 
        userId={session.user.id} 
        userProfile={userProfile} 
        durationMinutes={50} 
      />
    </div>
  );
}
