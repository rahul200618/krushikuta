import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ExamTestInterface } from "@/components/exam/ExamTestInterface";
import { getProfile, listMockTests, checkUserAccess } from "@/lib/exam-api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { verifyDeviceLock } from "@/lib/device-lock";

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
    const checkAuthAndAccess = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error("Please sign in to take the test");
        navigate({ to: "/ao/aao" });
        return;
      }
      
      const user = data.session.user;
      setSession(data.session);

      try {
        const [profileRes, testsRes] = await Promise.all([
          getProfile(user.id),
          listMockTests(),
        ]);

        const profile = profileRes?.profile;
        setUserProfile(profile);

        if (profile) {
          const lockRes = await verifyDeviceLock(user.id, profile);
          if (lockRes.locked) {
            toast.error("Access Denied: This account is locked to another device.");
            navigate({ to: "/ao/aao" });
            return;
          }
        }

        const targetTestId = Number(testId);
        const allTests = testsRes?.tests || [];
        const currentTest = allTests.find((t: any) => t.id === targetTestId);

        const isPaperFree = (test: any) => {
          if (!test) return false;
          const title = (test.title || '').toLowerCase().trim();
          const cat = (test.category || '').toLowerCase().trim();
          if (
            title.includes('paper -i (general knowledge)') ||
            title.includes('paper-ii (bsc agri graduates)') ||
            (cat === 'general paper' && !title.includes('01') && !title.includes('02') && !title.includes('–') && !title.includes('- 0')) ||
            (cat === 'core papers' && !title.includes('01') && !title.includes('02') && !title.includes('–') && !title.includes('- 0'))
          ) {
            return true;
          }
          return false;
        };

        if (currentTest && !isPaperFree(currentTest)) {
          // Check purchases for user
          const { data: purchaseRows } = await supabase
            .from('user_purchases')
            .select('mock_test_id')
            .eq('user_id', user.id)
            .eq('status', 'active');

          let accessList = (purchaseRows || []).map((r: any) => r.mock_test_id);

          const email = user.email || (profile?.email as string);
          if (accessList.length === 0 && email) {
            try {
              const accessRes = await checkUserAccess(user.id, [], email);
              if (accessRes?.access) {
                accessList = accessRes.access;
              }
            } catch (e) {
              console.error('[ActiveTestPage] Access check error:', e);
            }
          }

          const matchingCustomCat = currentTest.category?.trim();
          const placeholderTest = allTests.find(
            (t: any) => t.title === '_SUBJECT_PLACEHOLDER_' && t.category?.toLowerCase().trim() === matchingCustomCat?.toLowerCase()
          );

          const hasAccess =
            accessList.includes(-1) ||
            accessList.includes(-101) ||
            accessList.includes(targetTestId) ||
            (placeholderTest && accessList.includes(placeholderTest.id)) ||
            (matchingCustomCat?.toLowerCase().includes('aho') && accessList.includes(-102));

          if (!hasAccess) {
            toast.error("Access Denied: Please unlock or purchase this test series to attend.");
            navigate({ to: "/ao/aao/premium", search: { show_pricing: true } as any });
            return;
          }
        }
      } catch (err) {
        console.error('[ActiveTestPage] Check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndAccess();
  }, [testId, navigate]);

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
