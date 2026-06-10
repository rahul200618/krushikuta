import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ExamScoreReport } from "@/components/exam/ExamScoreReport";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/exam-report/$submissionId")({
  component: ExamReportPage,
  head: () => ({
    meta: [{ title: "Score Report — Krishikuta" }],
  }),
});

function ExamReportPage() {
  const { submissionId } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error("Please sign in to view reports");
        navigate({ to: "/exam" });
        return;
      }
      setSession(data.session);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading score report...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="bg-background min-h-screen pb-12 print:pb-0 print:bg-white">
      <div className="print:hidden bg-primary text-primary-foreground py-6 px-4">
        <div className="container-px mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Exam Results</span>
            <h1 className="text-xl md:text-2xl font-bold mt-0.5">Score Report</h1>
          </div>
          <Button asChild variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 h-8 text-xs">
            <Link to="/exam">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Dashboard
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="container-px mx-auto max-w-4xl mt-6 print:mt-0 print:p-4">
        <ExamScoreReport submissionId={Number(submissionId)} />
      </div>
    </div>
  );
}
