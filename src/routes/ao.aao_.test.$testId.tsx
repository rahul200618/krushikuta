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
          if (test.is_free === true) return true;
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

          const AO_AAO_INTERNAL_CATEGORIES = [
            'ao/aao',
            'ao / aao',
            'important papers',
            'bsc agri(85%)-paper ii',
            'bsc agri',
            'general knowledge-paper i',
            'general paper',
            'core papers',
            'general',
            'practical exam'
          ];

          const normalizeExamName = (str?: string) => {
            if (!str) return '';
            return str.toLowerCase().replace(/[\s\-_/\\|]+/g, '').trim();
          };

          const isAoAaoPaper = (c?: string) => {
            if (!c) return true;
            const catLower = c.toLowerCase().trim();
            return AO_AAO_INTERNAL_CATEGORIES.some(a => catLower.includes(a)) || normalizeExamName(catLower) === 'aoaao';
          };

          const getLinkedExams = (t: any) => {
            if (!t) return [];
            try {
              if (t.popup_message && typeof t.popup_message === 'string' && t.popup_message.startsWith('{')) {
                const parsed = JSON.parse(t.popup_message);
                if (Array.isArray(parsed.linked_exams)) {
                  return parsed.linked_exams;
                }
              }
            } catch (e) {}
            return [];
          };

          const isPaperInExam = (t: any, targetExamId: string, targetExamShortTitle: string) => {
            const linked = getLinkedExams(t);
            const normId = normalizeExamName(targetExamId);
            const normShort = normalizeExamName(targetExamShortTitle);

            const isExplicitlyLinked = linked.some((l: string) => {
              const normL = normalizeExamName(l);
              if (!normL) return false;
              return (
                normL === normId ||
                normL === normShort ||
                normL.startsWith(normId) ||
                normL.startsWith(normShort) ||
                (normShort.length > 0 && normL.includes(normShort))
              );
            });

            if (isExplicitlyLinked) return true;

            const rawCat = (t.category || '').trim();
            const normCat = normalizeExamName(rawCat);

            if (normId === 'aoaao') {
              if (isAoAaoPaper(rawCat)) return true;
              return false;
            }

            if (normCat === normId || normCat === normShort) return true;
            if (normShort.length > 0 && normCat.includes(normShort)) return true;

            return false;
          };

          const placeholderTests = allTests.filter((t: any) => t.title === '_SUBJECT_PLACEHOLDER_');

          let hasExamAccess = false;
          if (accessList.includes(-101) && isPaperInExam(currentTest, 'AO / AAO', 'AO / AAO')) {
            hasExamAccess = true;
          }
          if (accessList.includes(-102) && (isPaperInExam(currentTest, 'AHO / ADH', 'AHO / ADH') || isPaperInExam(currentTest, 'AHO/ADH', 'AHO/ADH') || (currentTest.category && currentTest.category.toLowerCase().includes('aho')))) {
            hasExamAccess = true;
          }

          for (const pRow of placeholderTests) {
            if (accessList.includes(pRow.id)) {
              const examName = pRow.category?.trim();
              if (examName) {
                if (isPaperInExam(currentTest, examName, examName)) {
                  hasExamAccess = true;
                  break;
                }
                if (normalizeExamName(examName).includes('aho') && (isPaperInExam(currentTest, 'AHO/ADH', 'AHO/ADH') || isPaperInExam(currentTest, 'AHO / ADH', 'AHO / ADH'))) {
                  hasExamAccess = true;
                  break;
                }
              }
            }
          }

          const hasAccess =
            accessList.includes(-1) ||
            accessList.includes(targetTestId) ||
            hasExamAccess;

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
