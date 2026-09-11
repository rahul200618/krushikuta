import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { listMockTests, getUserPerformance, checkUserAccess } from '@/lib/exam-api';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Clock, 
  BookOpen, 
  Lock, 
  Unlock, 
  Loader2, 
  Star, 
  FileText, 
  ChevronLeft, 
  ChevronDown,
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Search
} from 'lucide-react';

interface MockTest {
  id: number; 
  title: string; 
  description: string; 
  category: string;
  price: number; 
  image_url?: string; 
  is_active: boolean; 
  is_free?: boolean;
}

interface Performance {
  totalAttempts: number; 
  averageScore: number; 
  bestScore: number;
  submissions: Array<{ 
    id: number; 
    score: number; 
    total_questions: number; 
    submitted_at: string; 
    mock_tests?: { title: string; category: string } 
  }>;
}

interface ExamDashboardProps {
  userId?: string;
  userEmail?: string;
  userProfile?: Record<string, any> | null;
  onRequireAuth?: () => void;
  domainFilter?: string;
}

interface DynamicExam {
  id: string;
  name: string;
  shortTitle: string;
  designation: string;
  description: string;
  price: number;
  papers: MockTest[];
  freeCount: number;
  paidCount: number;
  isUnlocked: boolean;
}

export function ExamDashboard({ userId, userEmail, userProfile, onRequireAuth, domainFilter }: ExamDashboardProps) {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [accessList, setAccessList] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(() => {
    if (domainFilter === 'AO/AAO') return 'AO / AAO';
    if (domainFilter === 'AHO/ADH') return 'AHO / ADH';
    return null;
  });
  const [paperFilterTab, setPaperFilterTab] = useState<'all' | 'free' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>(['free', 'important', 'bsc_agri', 'gk']);
  const navigate = useNavigate();

  const formatScore = (val: number | null | undefined, totalQuestions: number) => {
    if (val === undefined || val === null) return '0';
    const isScaled = val > totalQuestions * 3 || val < 0;
    const score = isScaled ? val / 100 : val;
    return score % 1 === 0 ? score.toString() : score.toFixed(2);
  };

  useEffect(() => {
    if (selectedSubject) {
      document.body.classList.add('hide-site-header');
    } else {
      document.body.classList.remove('hide-site-header');
    }
    return () => {
      document.body.classList.remove('hide-site-header');
    };
  }, [selectedSubject]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [testsRes, perfRes] = await Promise.all([
          listMockTests(),
          userId ? getUserPerformance(userId) : Promise.resolve(null),
        ]);
        const allTests: MockTest[] = testsRes.tests || [];
        setTests(allTests);
        setPerformance(perfRes);

        if (userId) {
          const { data: purchaseRows } = await supabase
            .from('user_purchases')
            .select('mock_test_id')
            .eq('user_id', userId)
            .eq('status', 'active');

          let access = (purchaseRows || []).map((r: any) => r.mock_test_id);

          if (access.length === 0 && userEmail) {
            try {
              const res = await checkUserAccess(userId, [], userEmail);
              if (res && res.access && res.access.length > 0) {
                access = res.access;
              }
            } catch (e) {
              console.error('[ExamDashboard] Access check error:', e);
            }
          }

          setAccessList(access);
        }
      } catch (err) {
        console.error('[ExamDashboard] General load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (userId) {
      channel = supabase.channel('user-purchases-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_purchases', filter: `user_id=eq.${userId}` },
          () => { load(); }
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, userEmail]);

  const paidTests = tests.filter(t => !t.is_free && t.price > 0 && t.title !== '_SUBJECT_PLACEHOLDER_').sort((a, b) => a.id - b.id);
  const first6TestIds = paidTests.slice(0, 6).map(t => t.id);

  // ── GROUPING LOGIC ──────────────────────────────────────────
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

  const isAoAaoPaper = (cat?: string) => {
    if (!cat) return true;
    const clean = cat.toLowerCase().trim();
    return AO_AAO_INTERNAL_CATEGORIES.some(c => clean === c || clean.includes('important') || clean.includes('bsc agri') || clean.includes('general knowledge') || clean.includes('general paper') || clean.includes('core papers'));
  };

  const getLinkedExams = (test: MockTest): string[] => {
    let linked: string[] = [];
    try {
      const raw = (test as any).popup_message;
      if (raw) {
        let parsed = raw;
        if (typeof raw === 'string') {
          const trimmed = raw.trim();
          if (trimmed.startsWith('{')) {
            parsed = JSON.parse(trimmed);
          }
        }
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.linked_exams)) {
          linked = parsed.linked_exams;
        }
      }
    } catch (e) { /* ignore */ }
    return linked;
  };

  const isPaperInExam = (test: MockTest, examId: string, examName: string): boolean => {
    const linked = getLinkedExams(test);
    const normExamId = normalizeExamName(examId);
    const normExamName = normalizeExamName(examName);
    const isTargetAo = normExamId === 'aoaao' || (normExamId.startsWith('ao') && !normExamId.includes('aho'));

    // 1. Check multi-exam linked tags
    if (linked.some(l => {
      const normL = normalizeExamName(l);
      if (!normL) return false;
      return (
        normL === normExamId ||
        normL === normExamName ||
        normExamId.includes(normL) ||
        normL.includes(normExamId) ||
        (isTargetAo && (normL === 'aoaao' || (normL.startsWith('ao') && !normL.includes('aho'))))
      );
    })) {
      return true;
    }

    // 2. Check native category
    const rawCat = (test.category || '').trim();
    const normCat = normalizeExamName(rawCat);

    if (isTargetAo && (isAoAaoPaper(rawCat) || normCat === 'aoaao' || (normCat.startsWith('ao') && !normCat.includes('aho')))) {
      return true;
    }

    if (
      normCat === normExamId ||
      normCat === normExamName ||
      normCat.startsWith(normExamId) ||
      normCat.startsWith(normExamName) ||
      rawCat.toLowerCase().startsWith(`${examName.toLowerCase()}::`) ||
      rawCat.toLowerCase().startsWith(`${examId.toLowerCase()}::`)
    ) {
      return true;
    }

    return false;
  };

  // 1. Base Default Exam: AO / AAO
  const defaultAoExam: DynamicExam = {
    id: 'AO / AAO',
    name: 'AO / AAO Preparation',
    shortTitle: 'AO / AAO',
    designation: 'Agriculture Officer & Assistant Officer',
    description: 'Comprehensive CBT Mock Series for KPSC & State Agriculture Officer recruitment with instant score & state-level percentile.',
    price: 3000,
    papers: [],
    freeCount: 0,
    paidCount: 0,
    isUnlocked: accessList.includes(-1) || accessList.includes(-101)
  };

  // 2. Custom created exams (from _SUBJECT_PLACEHOLDER_)
  const customExams: Record<string, DynamicExam> = {};

  tests.forEach(test => {
    if (test.title === '_SUBJECT_PLACEHOLDER_') {
      const cat = test.category?.trim();
      if (cat && !isAoAaoPaper(cat)) {
        customExams[cat] = {
          id: cat,
          name: `${cat} Preparation`,
          shortTitle: cat,
          designation: test.description && test.description !== '_SUBJECT_PLACEHOLDER_' ? test.description : 'Competitive Mock Test Series',
          description: test.description && test.description !== '_SUBJECT_PLACEHOLDER_' ? test.description : 'Comprehensive Computer Based Test series with real exam simulation and ranking.',
          price: test.price || 3000,
          papers: [],
          freeCount: 0,
          paidCount: 0,
          placeholderTestId: test.id,
          isUnlocked: accessList.includes(-1) || accessList.includes(test.id) || (normalizeExamName(cat).includes('aho') && accessList.includes(-102))
        };
      }
    }
  });

  const isPaperFree = (test: MockTest) => {
    if (!test) return false;
    if (test.is_free === true) return true;
    const title = (test.title || '').toLowerCase().trim();
    const cat = (test.category || '').toLowerCase().trim();

    // Strictly the 2 official free practice papers or tests explicitly marked is_free:
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

  const dynamicExamsList = [defaultAoExam, ...Object.values(customExams)];

  // 3. Distribute all real mock test papers (including multi-exam linked papers)
  tests.forEach(test => {
    if (test.title === '_SUBJECT_PLACEHOLDER_' || test.title === '_SUBJECT_SECTION_') return;
    if (!test.is_active) return;

    dynamicExamsList.forEach(targetExam => {
      if (isPaperInExam(test, targetExam.id, targetExam.shortTitle)) {
        if (!targetExam.papers.some(p => p.id === test.id)) {
          targetExam.papers.push(test);
          if (isPaperFree(test)) {
            targetExam.freeCount++;
          } else {
            targetExam.paidCount++;
          }
        }
      }
    });
  });

  const hasTestAccess = (test: MockTest) => {
    if (isPaperFree(test)) return true;
    if (accessList.includes(-1)) return true;
    if (accessList.includes(test.id)) return true;

    // Check if user has access to ANY of the exams this test is linked to
    if (isPaperInExam(test, 'AO / AAO', 'AO / AAO')) {
      if (accessList.includes(-101) || (accessList.includes(-2) && first6TestIds.includes(test.id))) {
        return true;
      }
    }

    for (const customExam of Object.values(customExams)) {
      if (isPaperInExam(test, customExam.id, customExam.shortTitle)) {
        if (customExam.placeholderTestId && accessList.includes(customExam.placeholderTestId)) {
          return true;
        }
        if (customExam.id.toLowerCase().includes('aho') && accessList.includes(-102)) {
          return true;
        }
      }
    }

    return false;
  };

  const getTestStatus = (test: MockTest): 'free' | 'unlocked' | 'paid' => {
    if (isPaperFree(test)) return 'free';
    if (hasTestAccess(test)) return 'unlocked';
    return 'paid';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="text-xs text-slate-500 font-medium">Loading exam dashboard...</span>
      </div>
    );
  }

  // ── DYNAMIC SUBJECT SECTIONS SYSTEM ──────────────────────
  interface SubjectSection {
    id: string;
    title: string;
    badge: string;
    isFree: boolean;
    description: string;
    papers: MockTest[];
  }

  const isPaperInExamSection = (test: MockTest, examName: string, sectionTitle: string, sectionTag?: string): boolean => {
    const linked = getLinkedExams(test);
    const normExamName = normalizeExamName(examName);
    const normSectionTitle = normalizeExamName(sectionTitle);
    const normTag = sectionTag ? normalizeExamName(sectionTag) : '';
    const normExamSection = normalizeExamName(`${examName}::${sectionTitle}`);

    // 1. Is it linked explicitly to this section?
    const hasSectionLink = linked.some(l => {
      const normL = normalizeExamName(l);
      if (!normL) return false;
      return (
        normL === normExamSection ||
        (normTag && normL === normTag) ||
        normL === `${normExamName}${normSectionTitle}` ||
        (normL.includes(normExamName) && normL.includes(normSectionTitle))
      );
    });

    if (hasSectionLink) return true;

    // 2. Is it in this exam with matching native category?
    const rawCat = (test.category || '').trim();
    const normCat = normalizeExamName(rawCat);

    if (
      normCat === normExamSection ||
      (normTag && normCat === normTag) ||
      normCat === `${normExamName}${normSectionTitle}`
    ) {
      return true;
    }

    // 3. Free Practice Papers section
    if (normSectionTitle.includes('freepractice') || normSectionTitle === 'free') {
      if (isPaperFree(test) && isPaperInExam(test, examName, examName)) {
        return true;
      }
    }

    // 4. Inferred matching if explicitly named AND is native to this exam
    const hasOtherSectionLinkInThisExam = linked.some(l => {
      const normL = normalizeExamName(l);
      return normL.includes(normExamName) && normL.length > normExamName.length;
    });

    if (
      !hasOtherSectionLinkInThisExam &&
      isPaperInExam(test, examName, examName) && 
      (normCat === normSectionTitle || (normCat.length > 0 && normCat.includes(normSectionTitle)))
    ) {
      return true;
    }

    return false;
  };

  const getExamSubjectSections = (exam: DynamicExam, filteredPapers: MockTest[]): SubjectSection[] => {
    const isAoAao = exam.id === 'AO / AAO' || exam.id === 'AO/AAO';
    const sortFn = (a: MockTest, b: MockTest) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });

    // Find custom subject section rows created for this exam (_SUBJECT_SECTION_)
    const customSubjectRows = tests.filter(
      t => t.title === '_SUBJECT_SECTION_' && 
      (t.category?.toLowerCase().trim() === exam.shortTitle.toLowerCase().trim() || 
       normalizeExamName(t.category) === normalizeExamName(exam.shortTitle) ||
       normalizeExamName(t.category) === normalizeExamName(exam.name) ||
       normalizeExamName(t.category) === normalizeExamName(exam.id))
    );

    const customSections: SubjectSection[] = customSubjectRows.map(row => {
      let meta: any = {};
      try {
        if (row.description && row.description.startsWith('{')) {
          meta = JSON.parse(row.description);
        }
      } catch (e) { /* ignore */ }

      const title = meta.name || row.category || 'Subject Section';
      return {
        id: `custom_${row.id}`,
        title: title,
        badge: meta.badge || (row.is_free ? 'Free Access' : 'Core Subject Mocks'),
        isFree: !!row.is_free,
        description: meta.subtitle || 'Custom subject mock test series',
        papers: []
      };
    });

    const freeSection: SubjectSection = {
      id: 'free',
      title: 'Free Practice Papers',
      badge: 'Free Access',
      isFree: true,
      description: 'Available immediately to all registered students without subscription',
      papers: filteredPapers.filter(t => isPaperFree(t)).sort(sortFn)
    };

    const paidPapers = filteredPapers.filter(t => !isPaperFree(t));

    // If custom sections have been created for this exam by admin:
    if (customSections.length > 0) {
      const remainingPaid: MockTest[] = [];
      paidPapers.forEach(p => {
        let matched = false;
        customSections.forEach(s => {
          if (isPaperInExamSection(p, exam.shortTitle, s.title, `${exam.shortTitle}::${s.title}`)) {
            s.papers.push(p);
            matched = true;
          }
        });
        if (!matched) {
          remainingPaid.push(p);
        }
      });

      customSections.forEach(s => s.papers.sort(sortFn));

      return [
        freeSection,
        ...customSections,
        ...(remainingPaid.length > 0 ? [{
          id: 'other',
          title: 'Additional Mock Papers',
          badge: 'Additional Sets',
          isFree: false,
          description: `Other mock papers and practice tests under ${exam.shortTitle}`,
          papers: remainingPaid.sort(sortFn)
        }] : [])
      ];
    }

    if (isAoAao) {
      const importantPapers = paidPapers.filter(t => t.category?.toLowerCase().includes('important'));
      const bscAgriPapers = paidPapers.filter(t => !importantPapers.includes(t) && (t.category?.toLowerCase().includes('bsc agri') || t.category?.toLowerCase().includes('paper ii') || t.title.toLowerCase().includes('bsc agri')));
      const gkPapers = paidPapers.filter(t => !importantPapers.includes(t) && !bscAgriPapers.includes(t) && (t.category?.toLowerCase().includes('general knowledge') || t.category?.toLowerCase().includes('paper i') || t.category?.toLowerCase().includes('gk') || t.title.toLowerCase().includes('general knowledge') || t.title.toLowerCase().includes('gk')));
      const otherPapers = paidPapers.filter(t => !importantPapers.includes(t) && !bscAgriPapers.includes(t) && !gkPapers.includes(t));

      return [
        freeSection,
        {
          id: 'important',
          title: 'Important Papers',
          badge: 'High Yield Series',
          isFree: false,
          description: 'Comprehensive high-priority question sets for General Knowledge and BSc Agri',
          papers: importantPapers.sort(sortFn)
        },
        {
          id: 'bsc_agri',
          title: 'BSc Agri(85%) – Paper II',
          badge: 'Core Subject Mocks',
          isFree: false,
          description: '100 marks full-syllabus Agriculture discipline mock test series',
          papers: bscAgriPapers.sort(sortFn)
        },
        {
          id: 'gk',
          title: 'General Knowledge – Paper I',
          badge: 'General Paper Mocks',
          isFree: false,
          description: 'Karnataka state general studies, current affairs, and mental ability series',
          papers: gkPapers.sort(sortFn)
        },
        ...(otherPapers.length > 0 ? [{
          id: 'other',
          title: 'Additional Mock Papers',
          badge: 'Additional Sets',
          isFree: false,
          description: 'Other mock papers and practice tests under AO / AAO',
          papers: otherPapers.sort(sortFn)
        }] : [])
      ];
    } else {
      if (paidPapers.length > 0) {
        return [
          freeSection,
          {
            id: 'paid',
            title: 'Subscription / Paid Papers',
            badge: 'Package Series',
            isFree: false,
            description: `Unlocked via ${exam.shortTitle} subject subscription or All-Access bundle`,
            papers: paidPapers.sort(sortFn)
          }
        ];
      }
      return [freeSection];
    }
  };

  // ── VIEW: INSIDE A SPECIFIC EXAM ─────────────────────────
  if (selectedSubject) {
    const currentExam = dynamicExamsList.find(d => 
      d.id === selectedSubject || 
      normalizeExamName(d.id) === normalizeExamName(selectedSubject) ||
      normalizeExamName(d.shortTitle) === normalizeExamName(selectedSubject) ||
      normalizeExamName(d.name) === normalizeExamName(selectedSubject)
    ) || dynamicExamsList[0];
    let examPapers = currentExam.papers;

    if (paperFilterTab === 'free') {
      examPapers = examPapers.filter(t => isPaperFree(t));
    } else if (paperFilterTab === 'paid') {
      examPapers = examPapers.filter(t => !isPaperFree(t));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      examPapers = examPapers.filter(t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
    }

    const examSections = getExamSubjectSections(currentExam, examPapers);

    const renderTestRow = (test: MockTest, index: number) => {
      const status = getTestStatus(test);
      const attempt = (performance?.submissions || []).find(s => (s as any).test_id === test.id);

      return (
        <div 
          key={test.id} 
          className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group border ${
            status === 'paid'
              ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 hover:border-emerald-500/30'
          }`}
        >
          {/* Left Details */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs transition-colors shadow-2xs ${
              status === 'paid'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 group-hover:border-emerald-500 group-hover:text-emerald-600'
            }`}>
              {status === 'paid' ? <Lock className="w-4 h-4 text-slate-400" /> : <FileText className="w-4 h-4" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`font-extrabold text-sm sm:text-base transition-colors leading-snug ${
                  status === 'paid' 
                    ? 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white' 
                    : 'text-slate-900 dark:text-white group-hover:text-emerald-600'
                }`}>
                  {test.title}
                </h4>
                {status === 'free' && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    Free
                  </span>
                )}
                {status === 'unlocked' && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                    <Unlock className="w-2.5 h-2.5 text-blue-600" /> Unlocked
                  </span>
                )}
                {status === 'paid' && (
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Locked
                  </span>
                )}
              </div>

              {test.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {test.description}
                </p>
              )}
            </div>
          </div>

          {/* Right Score & Action */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/70 dark:border-slate-800">
            {attempt && (
              <div className="text-xs bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1 shadow-2xs">
                <Star className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                <span className="text-slate-500 font-medium">Score:</span>
                <span className="font-black text-slate-900 dark:text-white">
                  {formatScore(attempt.score, (attempt as any).total_questions)}
                </span>
              </div>
            )}

            {status === 'paid' ? (
              <Button 
                onClick={() => {
                  if (!userId) onRequireAuth?.();
                  else navigate({ to: '/ao/aao/premium', search: { show_pricing: true } as any });
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl h-9 px-4 cursor-pointer w-full sm:w-auto flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95" 
                size="sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Unlock Access</span>
              </Button>
            ) : (
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs h-9 px-4 cursor-pointer w-full sm:w-auto flex items-center justify-center gap-1.5 transition-transform active:scale-95" 
                size="sm"
                onClick={() => {
                  if (!userId) onRequireAuth?.();
                  else navigate({ to: `/ao/aao/test/${test.id}` as any });
                }}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{attempt ? 'Retake Test' : 'Start Test'}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* Top Header & Action Bar: Back Button + Exam Portal Name + Filters + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-0.5 pb-1">
          {/* Left: Back Button + Exam Portal Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedSubject(null); setPaperFilterTab('all'); setSearchQuery(''); }}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs"
              title="Back to Exam Portals"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-display leading-tight">
                  {currentExam.name}
                </h1>
                {currentExam.isUnlocked ? (
                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Active
                  </Badge>
                ) : null}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium line-clamp-1">
                {currentExam.designation}
              </p>
            </div>
          </div>

          {/* Right: Filter Pills + Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
            {/* Filter Pills */}
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-1 sm:gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setPaperFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all text-center truncate ${
                  paperFilterTab === 'all' ? 'bg-white dark:bg-slate-800 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All ({currentExam.papers.length})
              </button>
              <button
                onClick={() => setPaperFilterTab('free')}
                className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 truncate ${
                  paperFilterTab === 'free' ? 'bg-white dark:bg-slate-800 shadow-xs text-emerald-600' : 'text-slate-500 hover:text-emerald-600'
                }`}
              >
                <Unlock className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Free ({currentExam.freeCount})</span>
              </button>
              <button
                onClick={() => setPaperFilterTab('paid')}
                className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 truncate ${
                  paperFilterTab === 'paid' ? 'bg-white dark:bg-slate-800 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3 h-3 text-slate-600 shrink-0" />
                <span>Paid ({currentExam.paidCount})</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search paper by title..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Papers Display: Vertical Cards One Below Other */}
        {examPapers.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-500 font-medium text-xs sm:text-sm">No papers found under this filter.</p>
            {paperFilterTab !== 'all' && (
              <Button variant="link" size="sm" onClick={() => setPaperFilterTab('all')} className="mt-1 text-xs text-emerald-600">
                View All {currentExam.shortTitle} Papers
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5 sm:space-y-4">
            {examSections.map((sec) => {
              if (sec.papers.length === 0 && paperFilterTab !== 'all') return null;
              const isExpanded = expandedSectionIds.includes(sec.id);

              return (
                <Card 
                  key={sec.id} 
                  className={`bg-white dark:bg-card border transition-all duration-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)] ${
                    isExpanded ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                  }`}
                >
                  {/* Card Header: Clickable to Open/Close Papers */}
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedSectionIds(prev => 
                        prev.includes(sec.id) ? prev.filter(x => x !== sec.id) : [...prev, sec.id]
                      );
                    }}
                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isExpanded 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-display">
                            {sec.title}
                          </h3>
                          <Badge className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            sec.isFree
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200'
                          }`}>
                            {sec.papers.length} Papers
                          </Badge>
                          {sec.isFree ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              Free Access
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 hidden sm:inline-block">
                              {sec.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {sec.description}
                        </p>
                      </div>
                    </div>

                    {/* Right Chevron & Toggle Text */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-emerald-600 hidden sm:inline-block">
                        {isExpanded ? 'Hide Papers' : 'Open Papers'}
                      </span>
                      <div className={`w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white dark:bg-slate-900 text-slate-500'
                      }`}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </button>

                  {/* Card Body: List of papers inside this card */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 pt-0 sm:pt-0 space-y-2 border-t border-slate-100 dark:border-slate-800 mt-1">
                      {sec.papers.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No papers available under this section.</p>
                      ) : (
                        <div className="pt-3 space-y-2">
                          {sec.papers.map((test, index) => renderTestRow(test, index))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── VIEW: MAIN EXAMS SELECTOR VIEW ───────────────────────────
  const allRealTests = tests.filter(t => t.title !== '_SUBJECT_PLACEHOLDER_' && t.is_active);

  const stats = [
    { 
      icon: BookOpen, 
      label: 'Exam Portals', 
      value: dynamicExamsList.length, 
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40'
    },
    { 
      icon: FileText, 
      label: 'Total Mock Papers', 
      value: allRealTests.length, 
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40'
    },
    { 
      icon: Trophy, 
      label: 'Your Attempts', 
      value: performance?.totalAttempts ?? 0, 
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40'
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Overview Welcome Header */}
      <div>
        <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
          Exam Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Welcome back, {userProfile?.name ? String(userProfile.name) : (userEmail || 'Student')}
        </p>
      </div>

      {/* Top summary stats — Minimalist Black, Green & White */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {stats.map(({ icon: Icon, label, value, iconColor, iconBg }) => (
          <Card 
            key={label} 
            className="p-2.5 sm:p-5 flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-4 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-emerald-300 dark:hover:border-emerald-800 transition-all"
          >
            <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight sm:tracking-wider truncate">{label}</p>
              <p className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-none mt-0.5">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Dynamic Exam Cards Grid — Minimalist Black, Green & White */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-1">
        {dynamicExamsList.map((exam) => {
          return (
            <Card
              key={exam.id}
              className="p-4 sm:p-6 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl flex flex-col justify-between gap-4 sm:gap-5 relative overflow-hidden group shadow-[0_2px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(16,185,129,0.1)] hover:border-emerald-500/50 transition-all duration-200"
            >
              {/* Minimal Top Green Accent Line */}
              <div className="absolute inset-x-0 top-0 h-[2.5px] sm:h-[3px] bg-emerald-600" />

              <div className="space-y-3 sm:space-y-4 relative z-10">
                {/* Header with Minimalist Badge & Status */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-xs ring-1 ring-slate-800 shrink-0 group-hover:bg-emerald-600 transition-colors">
                      {exam.shortTitle.split('/')[0].trim()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white font-display group-hover:text-emerald-600 transition-colors leading-tight truncate">
                        {exam.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate mt-0.5">
                        {exam.designation}
                      </p>
                    </div>
                  </div>

                  {exam.isUnlocked ? (
                    <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/80 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg shrink-0 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Active
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg shrink-0">
                      Exam Portal
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {exam.description}
                </p>

                {/* Minimalist 3-Column Aligned Badges Row */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-0.5">
                  <div className="py-1.5 px-1.5 rounded-lg sm:rounded-xl bg-slate-900 text-white text-[10px] sm:text-xs font-bold text-center flex items-center justify-center gap-1 shadow-xs truncate">
                    <span>📚</span> <span>{exam.papers.length} Total</span>
                  </div>
                  <div className="py-1.5 px-1.5 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] sm:text-xs font-bold text-center flex items-center justify-center gap-1 shadow-xs truncate">
                    <Unlock className="w-3 h-3 text-emerald-600 shrink-0" /> <span>{exam.freeCount} Free</span>
                  </div>
                  <div className="py-1.5 px-1.5 rounded-lg sm:rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-[10px] sm:text-xs font-bold text-center flex items-center justify-center gap-1 shadow-xs truncate">
                    <Lock className="w-3 h-3 text-slate-600 shrink-0" /> <span>{exam.paidCount} Paid</span>
                  </div>
                </div>
              </div>

              {/* Action Full-Width Minimal Green Button */}
              <div className="relative z-10 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  onClick={() => setSelectedSubject(exam.id)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-2.5 sm:py-3.5 h-auto rounded-xl shadow-[0_2px_10px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Explore {exam.shortTitle} Papers</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
