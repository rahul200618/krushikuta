import { useState, useEffect } from 'react';
import { listMockTests, saveMockTest, deleteMockTest, getMockQuestions, deleteMockQuestion } from '@/lib/exam-api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { QuestionDialog } from './QuestionDialog';
import { BulkUploadDialog } from './BulkUploadDialog';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft,
  Loader2, 
  Upload, 
  BookOpen, 
  Lock, 
  Unlock, 
  Settings, 
  GraduationCap,
  ArrowRight,
  Sparkles,
  Layers,
  Share2,
  Link2,
  CheckSquare,
  Square,
  Search,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface MockTest {
  id: number; 
  title: string; 
  description: string; 
  category: string;
  price: number; 
  image_url?: string; 
  is_active: boolean; 
  is_free?: boolean;
  popup_message?: string;
}

interface Question {
  id: number; 
  mock_test_id: number; 
  question_text: string; 
  options: string[];
  correct_option_index: number; 
  marks: number; 
  topic: string; 
  image_url?: string;
}

interface ExamGroup {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  freePapers: MockTest[];
  paidPapers: MockTest[];
  placeholderTestId?: number;
}

export function ExamEditorPanel() {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [expandedTest, setExpandedTest] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Record<number, Question[]>>({});
  const [qLoading, setQLoading] = useState<number | null>(null);

  // Modals state
  const [examCreateOpen, setExamCreateOpen] = useState(false);
  const [examCreateForm, setExamCreateForm] = useState({
    name: '',
    subtitle: '',
    description: '',
    price: '3000'
  });

  const [examEditOpen, setExamEditOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState('');
  const [examEditForm, setExamEditForm] = useState({
    name: '',
    subtitle: '',
    description: '',
    price: '3000'
  });

  // Subject / Section modals state
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<{ id?: number; name: string; subtitle: string; badge: string; isFree: boolean; examName: string } | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    subtitle: '',
    badge: 'Core Subject Mocks',
    is_free: false
  });

  const [paperDialogOpen, setPaperDialogOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState<MockTest | null>(null);
  const [paperForm, setPaperForm] = useState({
    title: '',
    description: '',
    category: 'AO/AAO',
    is_free: false,
    price: '3000',
    image_url: '',
    is_active: true,
    released_date: '',
    releasing_date: '-',
    status: 'RELEASED',
    linked_exams: [] as string[]
  });

  const [confirmDeleteExam, setConfirmDeleteExam] = useState<string | null>(null);
  const [confirmDeleteSubject, setConfirmDeleteSubject] = useState<{ id: number | string; name: string; categoryTag?: string; sectionTestId?: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'test' | 'question'; id: number } | null>(null);

  // Link / Share Papers modal state
  const [linkPapersDialogOpen, setLinkPapersDialogOpen] = useState(false);
  const [linkTargetExam, setLinkTargetExam] = useState<string>('');
  const [linkTargetSectionTitle, setLinkTargetSectionTitle] = useState<string>('');
  const [linkTargetSubjectTag, setLinkTargetSubjectTag] = useState<string>('');
  const [selectedTestIdsToLink, setSelectedTestIdsToLink] = useState<number[]>([]);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkFilterSourceExam, setLinkFilterSourceExam] = useState<string>('all');

  // Question modals
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [activeTestForQuestion, setActiveTestForQuestion] = useState<number | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkTestId, setBulkTestId] = useState<number | null>(null);

  useEffect(() => { fetchTests(); }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await listMockTests();
      setTests(res.tests || []);
      if (res.error) {
        toast.warning('Failed to load tests: ' + res.error);
      }
    } catch { toast.error('Failed to load tests'); } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (testId: number) => {
    if (questions[testId]) return;
    setQLoading(testId);
    try {
      const res = await getMockQuestions(testId);
      setQuestions(p => ({ ...p, [testId]: res.questions || [] }));
    } catch { } finally { setQLoading(null); }
  };

  const toggleExpand = (testId: number) => {
    if (expandedTest === testId) {
      setExpandedTest(null);
    } else {
      setExpandedTest(testId);
      loadQuestions(testId);
    }
  };

  // ── GROUPING & SECTION LOGIC ────────────────────────────────
  // Internal paper categories that belong strictly inside AO / AAO
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
  const defaultAoExam: ExamGroup = {
    id: 'AO / AAO',
    name: 'AO / AAO',
    subtitle: 'Agriculture Officer & Assistant Officer',
    description: 'Comprehensive CBT Mock Series for KPSC & State Agriculture Officer recruitment.',
    price: 3000,
    freePapers: [],
    paidPapers: []
  };

  // 2. Custom created exams (from _SUBJECT_PLACEHOLDER_)
  const customExams: Record<string, ExamGroup> = {};

  tests.forEach(test => {
    if (test.title === '_SUBJECT_PLACEHOLDER_') {
      const cat = test.category?.trim();
      if (cat && !isAoAaoPaper(cat)) {
        customExams[cat] = {
          id: cat,
          name: cat,
          subtitle: test.description && test.description !== '_SUBJECT_PLACEHOLDER_' ? test.description : 'Competitive Mock Test Series',
          description: test.description && test.description !== '_SUBJECT_PLACEHOLDER_' ? test.description : '',
          price: test.price || 3000,
          freePapers: [],
          paidPapers: [],
          placeholderTestId: test.id
        };
      } else if (test.price && (cat === 'AO/AAO' || cat === 'AO / AAO')) {
        defaultAoExam.price = test.price;
        defaultAoExam.placeholderTestId = test.id;
      }
    }
  });

  const isPaperFree = (test: MockTest) => {
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

  const examsList = [defaultAoExam, ...Object.values(customExams)];

  // 3. Distribute all real mock test papers (including multi-exam linked papers)
  tests.forEach(test => {
    if (test.title === '_SUBJECT_PLACEHOLDER_' || test.title === '_SUBJECT_SECTION_') return;

    examsList.forEach(targetExam => {
      if (isPaperInExam(test, targetExam.id, targetExam.name)) {
        const isFree = isPaperFree(test);
        if (isFree) {
          if (!targetExam.freePapers.some(p => p.id === test.id)) {
            targetExam.freePapers.push(test);
          }
        } else {
          if (!targetExam.paidPapers.some(p => p.id === test.id)) {
            targetExam.paidPapers.push(test);
          }
        }
      }
    });
  });

  examsList.forEach(e => {
    e.freePapers.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
    e.paidPapers.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
  });

  // ── DYNAMIC SUBJECT & SECTION SYSTEM ──────────────────────
  interface SubjectSection {
    id: string;
    title: string;
    categoryTag: string;
    badge: string;
    isFree: boolean;
    description: string;
    papers: MockTest[];
    isCustom?: boolean;
    sectionTestId?: number;
  }

  // ── LINK / SHARE PAPERS SYSTEM & SECTION MATCHING ───────────
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

  const getExamSubjectSections = (exam: ExamGroup): SubjectSection[] => {
    const isAoAao = exam.id === 'AO / AAO' || exam.id === 'AO/AAO';
    const allExamPapers = [...exam.freePapers, ...exam.paidPapers];

    // Find custom subject section rows created for this exam (_SUBJECT_SECTION_)
    const customSubjectRows = tests.filter(
      t => t.title === '_SUBJECT_SECTION_' && 
      (t.category?.toLowerCase().trim() === exam.name.toLowerCase().trim() || normalizeExamName(t.category) === normalizeExamName(exam.name))
    );

    const customSubjects: SubjectSection[] = customSubjectRows.map(row => {
      let meta: any = {};
      try {
        if (row.description && row.description.startsWith('{')) {
          meta = JSON.parse(row.description);
        }
      } catch (e) { /* ignore */ }

      const title = meta.name || row.category || 'Section';
      return {
        id: `custom_${row.id}`,
        title: title,
        categoryTag: `${exam.name}::${title}`,
        badge: meta.badge || (row.is_free ? 'Free Access' : 'Core Subject Mocks'),
        isFree: !!row.is_free,
        description: meta.subtitle || 'Custom mock test series',
        papers: [],
        isCustom: true,
        sectionTestId: row.id
      };
    });

    const sortFn = (a: MockTest, b: MockTest) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });

    // 1. Free Practice Papers Section (always at top)
    const freeSection: SubjectSection = {
      id: 'free',
      title: 'Free Practice Papers',
      categoryTag: isAoAao ? 'General Paper' : `${exam.name}::Free Practice Papers`,
      badge: 'Free Access',
      isFree: true,
      description: 'Available immediately to all registered students without subscription',
      papers: allExamPapers.filter(t => isPaperFree(t)).sort(sortFn),
      isCustom: false
    };

    const paidPapers = allExamPapers.filter(t => !isPaperFree(t));

    // If custom sections exist in database:
    if (customSubjects.length > 0) {
      const remainingPaid: MockTest[] = [];

      paidPapers.forEach(paper => {
        let matched = false;
        customSubjects.forEach(s => {
          if (isPaperInExamSection(paper, exam.name, s.title, s.categoryTag)) {
            s.papers.push(paper);
            matched = true;
          }
        });
        if (!matched) {
          remainingPaid.push(paper);
        }
      });

      customSubjects.forEach(s => s.papers.sort(sortFn));

      const additionalSections: SubjectSection[] = [];
      if (remainingPaid.length > 0) {
        additionalSections.push({
          id: 'other',
          title: 'Additional Mock Papers',
          categoryTag: isAoAao ? 'AO/AAO' : exam.name,
          badge: 'Additional Sets',
          isFree: false,
          description: `Other mock papers and practice tests under ${exam.name}`,
          papers: remainingPaid.sort(sortFn),
          isCustom: false
        });
      }

      return [freeSection, ...customSubjects, ...additionalSections];
    }

    // If NO custom sections created yet:
    if (isAoAao) {
      const importantPapers = paidPapers.filter(t => t.category?.toLowerCase().includes('important'));
      const bscAgriPapers = paidPapers.filter(t => !importantPapers.includes(t) && (t.category?.toLowerCase().includes('bsc agri') || t.category?.toLowerCase().includes('paper ii') || t.title.toLowerCase().includes('bsc agri')));
      const gkPapers = paidPapers.filter(t => !importantPapers.includes(t) && !bscAgriPapers.includes(t) && (t.category?.toLowerCase().includes('general knowledge') || t.category?.toLowerCase().includes('paper i') || t.category?.toLowerCase().includes('gk') || t.title.toLowerCase().includes('general knowledge') || t.title.toLowerCase().includes('gk')));
      const otherPapers = paidPapers.filter(t => !importantPapers.includes(t) && !bscAgriPapers.includes(t) && !gkPapers.includes(t));

      return [
        freeSection,
        ...(importantPapers.length > 0 ? [{
          id: 'important',
          title: 'Important Papers',
          categoryTag: 'IMPORTANT PAPERS',
          badge: 'High Yield Series',
          isFree: false,
          description: 'Comprehensive high-priority question sets for General Knowledge and BSc Agri',
          papers: importantPapers.sort(sortFn),
          isCustom: false
        }] : []),
        ...(bscAgriPapers.length > 0 ? [{
          id: 'bsc_agri',
          title: 'BSc Agri(85%) – Paper II',
          categoryTag: 'BSc Agri(85%)-Paper II',
          badge: 'Core Subject Mocks',
          isFree: false,
          description: '100 marks full-syllabus Agriculture discipline mock test series',
          papers: bscAgriPapers.sort(sortFn),
          isCustom: false
        }] : []),
        ...(gkPapers.length > 0 ? [{
          id: 'gk',
          title: 'General Knowledge – Paper I',
          categoryTag: 'General Knowledge-Paper I',
          badge: 'General Paper Mocks',
          isFree: false,
          description: 'Karnataka state general studies, current affairs, and mental ability series',
          papers: gkPapers.sort(sortFn),
          isCustom: false
        }] : []),
        ...(otherPapers.length > 0 ? [{
          id: 'other',
          title: 'Additional Mock Papers',
          categoryTag: 'AO/AAO',
          badge: 'Additional Sets',
          isFree: false,
          description: 'Other mock papers and practice tests under AO / AAO',
          papers: otherPapers.sort(sortFn),
          isCustom: false
        }] : [])
      ];
    } else {
      // Dynamic exam with no custom sections yet
      if (paidPapers.length > 0) {
        return [
          freeSection,
          {
            id: 'paid',
            title: 'Subscription / Paid Papers',
            categoryTag: exam.name,
            badge: 'Package Series',
            isFree: false,
            description: `Unlocked via ${exam.name} subject subscription (₹${exam.price}) or All-Access bundle`,
            papers: paidPapers.sort(sortFn),
            isCustom: false
          }
        ];
      }
      return [freeSection];
    }
  };

  // ── MODALS & HANDLERS ────────────────────────────────────
  const openAddSubject = (examName: string) => {
    setEditingSubject(null);
    setSubjectForm({
      name: '',
      subtitle: '',
      badge: 'Core Subject Mocks',
      is_free: false
    });
    setSubjectDialogOpen(true);
  };

  const openEditSubject = (subject: SubjectSection, examName: string) => {
    const rawId = subject.sectionTestId || (typeof subject.id === 'string' && subject.id.startsWith('custom_') ? Number(subject.id.replace('custom_', '')) : (typeof subject.id === 'number' ? subject.id : undefined));
    setEditingSubject({
      id: typeof rawId === 'number' ? rawId : undefined,
      name: subject.title,
      subtitle: subject.description,
      badge: subject.badge,
      isFree: subject.isFree,
      examName: examName,
      categoryTag: subject.categoryTag
    });
    setSubjectForm({
      name: subject.title,
      subtitle: subject.description,
      badge: subject.badge,
      is_free: subject.isFree
    });
    setSubjectDialogOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = subjectForm.name.trim();
    if (!name) {
      toast.error('Section title is required');
      return;
    }
    const activeExam = examsList.find(e => e.id === selectedExamId) || defaultAoExam;
    const examName = activeExam.name;
    const descObj = {
      name,
      subtitle: subjectForm.subtitle.trim(),
      badge: subjectForm.badge.trim() || 'Core Subject Mocks',
      isFree: subjectForm.is_free
    };

    setLoading(true);
    try {
      const isExistingDbRow = typeof editingSubject?.id === 'number';
      const payload = {
        ...(isExistingDbRow ? { id: editingSubject.id } : {}),
        title: '_SUBJECT_SECTION_',
        category: examName,
        description: JSON.stringify(descObj),
        price: subjectForm.is_free ? 0 : activeExam.price,
        is_free: subjectForm.is_free,
        is_active: true
      };
      const res = await saveMockTest(payload);

      // If editing an existing section and name changed, migrate papers under it
      if (editingSubject?.categoryTag && editingSubject.name !== name) {
        const oldTag = editingSubject.categoryTag.toLowerCase().trim();
        const papersToMigrate = tests.filter(t => 
          t.title !== '_SUBJECT_SECTION_' &&
          t.title !== '_SUBJECT_PLACEHOLDER_' && (
            t.category?.toLowerCase().trim() === oldTag || 
            t.category?.toLowerCase().trim() === `${examName}::${editingSubject.name}`.toLowerCase().trim()
          )
        );
        if (papersToMigrate.length > 0) {
          const migrated = await Promise.all(papersToMigrate.map(p => saveMockTest({ ...p, category: `${examName}::${name}` })));
          setTests(p => p.map(t => {
            const up = migrated.find(m => m.test.id === t.id);
            return up ? up.test : t;
          }));
        }
      }

      if (isExistingDbRow) {
        setTests(p => p.map(t => t.id === res.test.id ? res.test : t));
        toast.success(`Section "${name}" updated successfully!`);
      } else {
        setTests(p => [res.test, ...p]);
        toast.success(`Section "${name}" created in ${examName}!`);
      }
      setSubjectDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save section');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (sectionId: number | string, subjectName: string, categoryTag?: string, sectionTestId?: number) => {
    setLoading(true);
    try {
      let dbId: number | null = null;
      if (typeof sectionTestId === 'number') {
        dbId = sectionTestId;
      } else if (typeof sectionId === 'number') {
        dbId = sectionId;
      } else if (typeof sectionId === 'string' && sectionId.startsWith('custom_')) {
        const parsed = Number(sectionId.replace('custom_', ''));
        if (!isNaN(parsed)) dbId = parsed;
      }

      if (dbId) {
        await deleteMockTest(dbId);
        setTests(p => p.filter(t => t.id !== dbId));
      }

      // Reassign any papers tagged with this section category to the base exam
      const activeExam = examsList.find(e => e.id === selectedExamId) || defaultAoExam;
      const examName = activeExam.name;

      if (categoryTag || subjectName) {
        const matchingPapers = tests.filter(t => 
          t.title !== '_SUBJECT_SECTION_' &&
          t.title !== '_SUBJECT_PLACEHOLDER_' && (
            (categoryTag && t.category?.toLowerCase().trim() === categoryTag.toLowerCase().trim()) ||
            (subjectName && t.category?.toLowerCase().trim() === `${examName}::${subjectName}`.toLowerCase().trim())
          )
        );

        if (matchingPapers.length > 0) {
          const updated = await Promise.all(
            matchingPapers.map(p => saveMockTest({ ...p, category: examName }))
          );
          setTests(p => p.map(t => {
            const found = updated.find(u => u.test.id === t.id);
            return found ? found.test : t;
          }));
        }
      }

      toast.success(`Section "${subjectName}" deleted.`);
      setConfirmDeleteSubject(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete section');
    } finally {
      setLoading(false);
    }
  };

  // Handlers for Exam Creation & Editing
  const openCreateExam = () => {
    setExamCreateForm({ name: '', subtitle: '', description: '', price: '3000' });
    setExamCreateOpen(true);
  };

  const handleSaveCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const examName = examCreateForm.name.trim();
    if (!examName) {
      toast.error('Exam Name is required');
      return;
    }
    try {
      const payload = {
        title: '_SUBJECT_PLACEHOLDER_',
        description: examCreateForm.subtitle.trim() || examCreateForm.description.trim() || '_SUBJECT_PLACEHOLDER_',
        category: examName,
        price: parseFloat(examCreateForm.price) || 3000,
        is_free: false,
        is_active: false,
        popup_message: null
      };
      const res = await saveMockTest(payload);
      setTests(p => [res.test, ...p]);
      toast.success(`Exam "${examName}" created successfully!`);
      setExamCreateOpen(false);
      setSelectedExamId(examName);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create exam');
    }
  };

  const openEditExam = (exam: ExamGroup) => {
    setEditingExamId(exam.id);
    setExamEditForm({
      name: exam.name,
      subtitle: exam.subtitle,
      description: exam.description,
      price: String(exam.price)
    });
    setExamEditOpen(true);
  };

  const handleSaveEditExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const newName = examEditForm.name.trim();
    const newPrice = parseFloat(examEditForm.price) || 3000;
    const newSub = examEditForm.subtitle.trim();
    if (!newName) {
      toast.error('Exam Name is required');
      return;
    }
    setLoading(true);
    try {
      const papersToUpdate = tests.filter(t => t.category === editingExamId || (editingExamId === 'AO / AAO' && (t.category === 'AO/AAO' || t.category === 'General' || t.category === 'Practical Exam')));
      
      const updated = await Promise.all(papersToUpdate.map(async (t) => {
        const payload = {
          ...t,
          category: newName,
          price: t.is_free ? 0 : newPrice,
          ...(t.title === '_SUBJECT_PLACEHOLDER_' ? { description: newSub } : {})
        };
        const res = await saveMockTest(payload);
        return res.test;
      }));

      setTests(p => p.map(t => {
        const up = updated.find(x => x.id === t.id);
        return up ? up : t;
      }));
      toast.success(`Exam "${newName}" updated successfully!`);
      setExamEditOpen(false);
      if (selectedExamId === editingExamId) {
        setSelectedExamId(newName);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update exam');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    setLoading(true);
    try {
      const papersToDelete = tests.filter(t => t.category === examId || (t.title === '_SUBJECT_SECTION_' && t.category === examId));
      await Promise.all(papersToDelete.map(t => deleteMockTest(t.id)));
      setTests(p => p.filter(t => t.category !== examId));
      toast.success(`Exam "${examId}" and its papers deleted.`);
      setConfirmDeleteExam(null);
      if (selectedExamId === examId) {
        setSelectedExamId(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete exam');
    } finally {
      setLoading(false);
    }
  };

  // ── LINK / SHARE PAPERS SYSTEM ───────────────────────────
  const openLinkPapersModal = (targetExamName: string, targetSectionTitle?: string, targetSubjectTag?: string) => {
    setLinkTargetExam(targetExamName);
    setLinkTargetSectionTitle(targetSectionTitle || '');
    setLinkTargetSubjectTag(targetSubjectTag || '');

    let preselected: number[] = [];
    if (targetSectionTitle) {
      const activeExam = examsList.find(e => normalizeExamName(e.name) === normalizeExamName(targetExamName)) || defaultAoExam;
      const sections = getExamSubjectSections(activeExam);
      const activeSection = sections.find(s => 
        normalizeExamName(s.title) === normalizeExamName(targetSectionTitle) ||
        (targetSubjectTag && normalizeExamName(s.categoryTag) === normalizeExamName(targetSubjectTag))
      );

      if (activeSection) {
        preselected = activeSection.papers.map(p => p.id);
      } else {
        preselected = tests.filter(t => 
          t.title !== '_SUBJECT_PLACEHOLDER_' && 
          t.title !== '_SUBJECT_SECTION_' && 
          isPaperInExamSection(t, targetExamName, targetSectionTitle, targetSubjectTag)
        ).map(t => t.id);
      }
    } else {
      preselected = tests.filter(t => 
        t.title !== '_SUBJECT_PLACEHOLDER_' && 
        t.title !== '_SUBJECT_SECTION_' && 
        isPaperInExam(t, targetExamName, targetExamName)
      ).map(t => t.id);
    }

    setSelectedTestIdsToLink(preselected);
    setLinkSearchQuery('');
    setLinkFilterSourceExam('all');
    setLinkPapersDialogOpen(true);
  };

  const handleSaveLinkPapers = async () => {
    if (!linkTargetExam) return;
    setLoading(true);
    try {
      const allRealPapers = tests.filter(t => t.title !== '_SUBJECT_PLACEHOLDER_' && t.title !== '_SUBJECT_SECTION_');
      
      const targetSectionKey = linkTargetSectionTitle ? `${linkTargetExam}::${linkTargetSectionTitle}` : linkTargetExam;
      const isFreeSection = linkTargetSectionTitle && (
        normalizeExamName(linkTargetSectionTitle).includes('free') || 
        (linkTargetSubjectTag && normalizeExamName(linkTargetSubjectTag).includes('free'))
      );

      const papersToUpdate = allRealPapers.filter(t => {
        const wasIn = linkTargetSectionTitle 
          ? isPaperInExamSection(t, linkTargetExam, linkTargetSectionTitle, linkTargetSubjectTag)
          : isPaperInExam(t, linkTargetExam, linkTargetExam);
        const shouldBeIn = selectedTestIdsToLink.includes(t.id);
        return wasIn !== shouldBeIn;
      });

      if (papersToUpdate.length === 0) {
        toast.info('No changes to paper links.');
        setLinkPapersDialogOpen(false);
        return;
      }

      const updated = await Promise.all(papersToUpdate.map(async (test) => {
        let sched: any = { released_date: '', releasing_date: '-', status: 'RELEASED', linked_exams: [] };
        try {
          if (test.popup_message && test.popup_message.startsWith('{')) {
            sched = { ...sched, ...JSON.parse(test.popup_message) };
          }
        } catch (e) { /* ignore */ }

        let currentLinked: string[] = Array.isArray(sched.linked_exams) ? [...sched.linked_exams] : [];
        if (currentLinked.length === 0) {
          if (test.category) currentLinked.push(test.category);
          else currentLinked.push('AO / AAO');
        }

        const shouldBeIn = selectedTestIdsToLink.includes(test.id);
        const normTargetKey = normalizeExamName(targetSectionKey);
        const normTargetExam = normalizeExamName(linkTargetExam);

        if (shouldBeIn) {
          if (linkTargetSectionTitle) {
            if (!currentLinked.some(e => normalizeExamName(e) === normTargetKey)) {
              currentLinked.push(targetSectionKey);
            }
          }
          if (!currentLinked.some(e => normalizeExamName(e) === normTargetExam)) {
            currentLinked.push(linkTargetExam);
          }
        } else {
          if (linkTargetSectionTitle) {
            currentLinked = currentLinked.filter(e => {
              const normE = normalizeExamName(e);
              return (
                normE !== normTargetKey && 
                normE !== `${normTargetExam}${normalizeExamName(linkTargetSectionTitle)}` &&
                (linkTargetSubjectTag ? normE !== normalizeExamName(linkTargetSubjectTag) : true)
              );
            });
            const stillHasSectionInExam = currentLinked.some(e => {
              const normE = normalizeExamName(e);
              return normE.startsWith(normTargetExam) && normE !== normTargetExam;
            });
            if (!stillHasSectionInExam && (test.category || '').toLowerCase() !== linkTargetExam.toLowerCase()) {
              currentLinked = currentLinked.filter(e => normalizeExamName(e) !== normTargetExam);
            }
          } else {
            currentLinked = currentLinked.filter(e => !normalizeExamName(e).startsWith(normTargetExam));
          }
        }

        const updatedIsFree = isFreeSection && shouldBeIn ? true : test.is_free;

        const payload = {
          ...test,
          is_free: updatedIsFree,
          popup_message: JSON.stringify({
            ...sched,
            linked_exams: currentLinked
          })
        };
        const res = await saveMockTest(payload);
        return res.test;
      }));

      setTests(p => p.map(t => {
        const up = updated.find(x => x.id === t.id);
        return up ? up : t;
      }));

      const destName = linkTargetSectionTitle ? `"${linkTargetSectionTitle}" in ${linkTargetExam}` : linkTargetExam;
      toast.success(`Successfully updated linked papers for ${destName}!`);
      setLinkPapersDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update linked papers');
    } finally {
      setLoading(false);
    }
  };

  // Handlers for Papers Creation & Editing
  const openAddPaper = (examName: string, isFree: boolean, defaultPrice: number, defaultCategory?: string) => {
    setEditingPaper(null);
    setPaperForm({
      title: '',
      description: '',
      category: defaultCategory || (examName === 'AO / AAO' ? (isFree ? 'General Paper' : 'IMPORTANT PAPERS') : examName),
      is_free: isFree,
      price: isFree ? '0' : String(defaultPrice),
      image_url: '',
      is_active: true,
      released_date: new Date().toLocaleDateString('en-GB'),
      releasing_date: '-',
      status: 'RELEASED',
      linked_exams: [examName]
    });
    setPaperDialogOpen(true);
  };

  const openEditPaper = (paper: MockTest) => {
    setEditingPaper(paper);
    let sched: any = { released_date: '', releasing_date: '-', status: 'RELEASED', linked_exams: [] };
    try {
      if (paper.popup_message && paper.popup_message.startsWith('{')) {
        sched = { ...sched, ...JSON.parse(paper.popup_message) };
      }
    } catch (e) { /* ignore */ }

    const initialLinked = Array.isArray(sched.linked_exams) && sched.linked_exams.length > 0
      ? sched.linked_exams
      : [paper.category || 'AO / AAO'];

    setPaperForm({
      title: paper.title,
      description: paper.description || '',
      category: paper.category,
      is_free: !!paper.is_free,
      price: String(paper.price || 0),
      image_url: paper.image_url || '',
      is_active: paper.is_active,
      released_date: sched.released_date || '',
      releasing_date: sched.releasing_date || '-',
      status: sched.status || 'RELEASED',
      linked_exams: initialLinked
    });
    setPaperDialogOpen(true);
  };

  const handleSavePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editingPaper ? { id: editingPaper.id } : {}),
        title: paperForm.title,
        description: paperForm.description,
        category: paperForm.category,
        price: paperForm.is_free ? 0 : (parseFloat(paperForm.price) || 0),
        is_free: paperForm.is_free,
        image_url: paperForm.image_url || null,
        is_active: paperForm.is_active,
        popup_message: JSON.stringify({
          released_date: paperForm.released_date,
          releasing_date: paperForm.releasing_date,
          status: paperForm.status,
          linked_exams: paperForm.linked_exams.length > 0 ? paperForm.linked_exams : [paperForm.category]
        })
      };
      const res = await saveMockTest(payload);
      if (editingPaper) {
        setTests(p => p.map(t => t.id === editingPaper.id ? res.test : t));
        toast.success('Paper updated successfully!');
      } else {
        setTests(p => [res.test, ...p]);
        toast.success(`Paper added to ${paperForm.category}!`);
      }
      setPaperDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save paper');
    }
  };

  const handleDeleteTest = async (id: number) => {
    try {
      await deleteMockTest(id);
      setTests(p => p.filter(t => t.id !== id));
      toast.success('Paper deleted');
    } catch { toast.error('Failed to delete paper'); }
    setConfirmDelete(null);
  };

  const handleDeleteQuestion = async (id: number, testId: number) => {
    try {
      await deleteMockQuestion(id);
      setQuestions(p => ({ ...p, [testId]: (p[testId] || []).filter(q => q.id !== id) }));
      toast.success('Question deleted');
    } catch { toast.error('Failed to delete question'); }
    setConfirmDelete(null);
  };

  const onQuestionSaved = (q: Question, testId: number) => {
    setQuestions(p => {
      const existing = p[testId] || [];
      const idx = existing.findIndex(x => x.id === q.id);
      if (idx >= 0) {
        const updated = [...existing];
        updated[idx] = q;
        return { ...p, [testId]: updated };
      }
      return { ...p, [testId]: [...existing, q] };
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="text-xs text-muted-foreground">Loading exams & papers manager...</span>
      </div>
    );
  }

  // ── VIEW 2: DRILL DOWN INSIDE A SPECIFIC EXAM ──────────────────────────
  if (selectedExamId) {
    const activeExam = examsList.find(e => e.id === selectedExamId) || defaultAoExam;
    const isAoAao = activeExam.id === 'AO / AAO' || activeExam.id === 'AO/AAO';
    const examSections = getExamSubjectSections(activeExam);
    const totalPapersCount = examSections.reduce((acc, s) => acc + s.papers.length, 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Drill Down Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedExamId(null)}
              className="rounded-xl border-border hover:bg-slate-100 font-bold text-xs"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              All Exams
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                  {activeExam.name}
                </h3>
                <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] font-bold">
                  {totalPapersCount} Papers
                </Badge>
                <Badge className="bg-amber-100 text-amber-900 border-0 text-[10px] font-bold">
                  ₹{activeExam.price} Package Price
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeExam.subtitle || 'Manage mock test question papers, subject categories, and questions'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              size="sm" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-9 px-3.5 shadow-xs flex items-center gap-1.5 cursor-pointer"
              onClick={() => openAddSubject(activeExam.name)}
            >
              <Plus className="w-4 h-4" /> + Add Section
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold rounded-xl h-9 px-3 cursor-pointer"
              onClick={() => openLinkPapersModal(activeExam.name)}
            >
              <Share2 className="w-3.5 h-3.5 mr-1" /> 🔗 Link Papers
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold rounded-xl h-9 px-3 cursor-pointer"
              onClick={() => openAddPaper(activeExam.name, true, 0, isAoAao ? 'General Paper' : undefined)}
            >
              <Unlock className="w-3.5 h-3.5 mr-1" /> + Add Free Paper
            </Button>
            <Button 
              size="sm" 
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-9 px-3 cursor-pointer"
              onClick={() => openAddPaper(activeExam.name, false, activeExam.price, isAoAao ? 'IMPORTANT PAPERS' : undefined)}
            >
              <Lock className="w-3.5 h-3.5 mr-1" /> + Add Paid Paper
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="w-9 h-9 text-slate-600 rounded-xl cursor-pointer"
              onClick={() => openEditExam(activeExam)}
              title="Edit Exam Details"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Unified Subject Sections inside Active Exam */}
        <div className="space-y-6">
          {examSections.map((sec, secIdx) => {
            const secColors = [
              { border: 'border-emerald-200', bg: 'bg-emerald-50/20', icon: Unlock, iconColor: 'text-emerald-600', badgeColor: 'bg-emerald-100 text-emerald-800' },
              { border: 'border-blue-200', bg: 'bg-blue-50/20', icon: BookOpen, iconColor: 'text-blue-600', badgeColor: 'bg-blue-100 text-blue-800' },
              { border: 'border-purple-200', bg: 'bg-purple-50/20', icon: GraduationCap, iconColor: 'text-purple-600', badgeColor: 'bg-purple-100 text-purple-800' },
              { border: 'border-amber-200', bg: 'bg-amber-50/20', icon: Lock, iconColor: 'text-amber-600', badgeColor: 'bg-amber-100 text-amber-800' },
              { border: 'border-slate-200', bg: 'bg-slate-50/20', icon: Layers, iconColor: 'text-slate-600', badgeColor: 'bg-slate-100 text-slate-800' }
            ][secIdx % 5];
            
            const SecIcon = secColors.icon;

            return (
              <Card key={sec.id} className={`p-5 border ${secColors.border} bg-white shadow-xs rounded-2xl`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <SecIcon className={`w-4 h-4 ${secColors.iconColor}`} /> {sec.title}
                      </h4>
                      <Badge className={`${secColors.badgeColor} border-0 text-[10px] font-bold`}>
                        {sec.papers.length} Papers
                      </Badge>
                      <Badge variant="outline" className="text-[9px] text-muted-foreground font-semibold">
                        {sec.badge}
                      </Badge>
                      {sec.isCustom && (
                        <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">Custom Section</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {sec.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
                    {sec.id !== 'free' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-xs text-slate-700 hover:text-emerald-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 px-2.5 rounded-xl font-bold gap-1 cursor-pointer"
                          onClick={() => openEditSubject(sec, activeExam.name)}
                          title="Edit Section Name & Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit Section
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50/50 px-2.5 rounded-xl font-bold gap-1 cursor-pointer"
                          onClick={() => setConfirmDeleteSubject({ 
                            id: sec.sectionTestId || sec.id, 
                            sectionTestId: sec.sectionTestId,
                            name: sec.title, 
                            categoryTag: sec.categoryTag 
                          })}
                          title="Delete Section"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Section
                        </Button>
                      </>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="text-xs font-bold text-indigo-700 hover:bg-indigo-50 rounded-xl h-8 px-2 cursor-pointer"
                      onClick={() => openLinkPapersModal(activeExam.name, sec.title, sec.categoryTag)}
                      title={`Link papers specifically into ${sec.title}`}
                    >
                      <Link2 className="w-3.5 h-3.5 mr-1" /> Link Papers
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl h-8 cursor-pointer"
                      onClick={() => openAddPaper(activeExam.name, sec.isFree, sec.isFree ? 0 : activeExam.price, sec.categoryTag)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> + Add Paper
                    </Button>
                  </div>
                </div>

                {sec.papers.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 text-center text-xs text-muted-foreground">
                    No papers added under "{sec.title}" yet. Click "+ Add Paper" above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sec.papers.map((paper) => renderPaperRow(paper, sec.isFree))}
                  </div>
                )}
              </Card>
            );
          })}

          {examSections.length === 1 && (
            <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h5 className="font-bold text-slate-800 text-sm">No Custom Subject Sections Added Yet</h5>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                  Organize your mock tests for {activeExam.name} into custom subject sections (e.g. Core Subject Mocks, General Studies, Topic-Wise Tests).
                </p>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl px-4 py-2 flex items-center gap-1.5 shadow-xs cursor-pointer"
                onClick={() => openAddSubject(activeExam.name)}
              >
                <Plus className="w-4 h-4" /> + Add Section
              </Button>
            </div>
          )}
        </div>

        {/* Common Dialogs */}
        {renderDialogs()}
      </div>
    );
  }

  // ── VIEW 1: OVERVIEW OF ALL AVAILABLE EXAMS ─────────────────────────
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h3 className="text-2xl font-bold font-serif text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-600" /> Exams Content Manager
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Click on any exam card below to manage its free papers, paid series, and questions.
          </p>
        </div>

        <Button 
          onClick={openCreateExam}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer self-start sm:self-auto px-4 py-2.5 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Create New Exam
        </Button>
      </div>

      {/* Grid of All Available Exams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 pt-1">
        {examsList.map((exam) => {
          const totalPapers = exam.freePapers.length + exam.paidPapers.length;
          return (
            <Card 
              key={exam.id} 
              className="p-5 sm:p-6 bg-white border border-slate-200/80 rounded-3xl flex flex-col justify-between gap-5 relative overflow-hidden group cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_35px_-8px_rgba(16,185,129,0.18),0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-1.5 transition-all duration-300 ease-out"
              onClick={() => setSelectedExamId(exam.id)}
            >
              {/* Subtle 3D glossy highlight on top border */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-400/40 via-teal-400/70 to-emerald-400/20" />
              
              {/* Subtle top corner gradient sphere */}
              <div className="absolute -top-10 -right-10 w-36 h-36 bg-gradient-to-bl from-emerald-400/15 via-teal-300/5 to-transparent rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

              <div className="space-y-3.5 relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-sm shadow-[0_4px_12px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/20 shrink-0 group-hover:scale-105 group-hover:rotate-1 transition-all duration-300">
                      {exam.name.split('/')[0].trim()}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-lg group-hover:text-emerald-700 transition-colors font-display leading-snug">
                        {exam.name}
                      </h4>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                        {exam.subtitle || 'Competitive Mock Test Series'}
                      </p>
                    </div>
                  </div>

                  <Badge className="bg-amber-100 text-amber-900 border-0 text-xs font-extrabold px-3 py-1 rounded-lg shrink-0">
                    ₹{exam.price}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {exam.description || 'Comprehensive CBT Mock Series with real test replica, timer, and state-level benchmarking.'}
                </p>

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-extrabold border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    📚 {totalPapers} Total Papers
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-extrabold border border-emerald-200/80 shadow-[0_1px_2px_rgba(16,185,129,0.06)] flex items-center gap-1">
                    <Unlock className="w-3 h-3" /> {exam.freePapers.length} Free
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-extrabold border border-amber-200/80 shadow-[0_1px_2px_rgba(245,158,11,0.06)] flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {exam.paidPapers.length} Paid
                  </span>
                </div>
              </div>

              {/* Action Bottom Bar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 relative z-10" onClick={e => e.stopPropagation()}>
                <Button 
                  onClick={() => setSelectedExamId(exam.id)}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-extrabold rounded-xl px-4 py-2 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(16,185,129,0.3)] active:translate-y-0.5 transition-all"
                >
                  <span>Open & Manage Papers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>

                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-8 h-8 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 shadow-xs"
                    onClick={() => openEditExam(exam)}
                    title="Edit Exam"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                  {exam.id !== 'AO / AAO' && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-8 h-8 text-destructive border border-slate-200 rounded-lg hover:bg-destructive/10 shadow-xs"
                      onClick={() => setConfirmDeleteExam(exam.id)}
                      title="Delete Exam"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {renderDialogs()}
    </div>
  );

  // Helper row renderer for papers inside active exam
  function renderPaperRow(paper: MockTest, isFree: boolean) {
    const qCount = (questions[paper.id] || []).length;
    return (
      <div key={paper.id} className="border border-border/80 rounded-xl overflow-hidden bg-white shadow-xs">
        <div 
          className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
          onClick={() => toggleExpand(paper.id)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-sm">{paper.title}</span>
              <Badge variant={paper.is_active ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0 h-4">
                {paper.is_active ? 'Active' : 'Draft'}
              </Badge>
              {isFree ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[9px] font-bold">Free</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-900 border-0 text-[9px] font-bold">Paid</Badge>
              )}
            </div>
            {paper.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{paper.description}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-7.5 h-7.5 text-primary"
              onClick={() => openEditPaper(paper)}
              title="Edit paper"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-7.5 h-7.5 text-destructive"
              onClick={() => setConfirmDelete({ type: 'test', id: paper.id })}
              title="Delete paper"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-7.5 h-7.5 text-muted-foreground"
              onClick={() => toggleExpand(paper.id)}
            >
              {expandedTest === paper.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {expandedTest === paper.id && (
          <div className="border-t border-border/80 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Questions ({qLoading === paper.id ? '…' : qCount})
              </span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs h-7.5 rounded-lg"
                  onClick={() => { setBulkTestId(paper.id); setBulkUploadOpen(true); }}
                >
                  <Upload className="w-3 h-3 mr-1" /> Bulk Upload
                </Button>
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7.5 rounded-lg"
                  onClick={() => { setActiveTestForQuestion(paper.id); setEditingQuestion(null); setQuestionDialogOpen(true); }}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Question
                </Button>
              </div>
            </div>

            {qLoading === paper.id ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>
            ) : qCount === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No questions added yet. Click Add Question or Bulk Upload.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(questions[paper.id] || []).map((q, idx) => (
                  <div key={q.id} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-border">
                    <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs line-clamp-2 text-slate-800 font-medium">{q.question_text}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{q.topic || 'General'}</span>
                        <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Ans: {String.fromCharCode(65 + q.correct_option_index)}</span>
                        <span className="text-[9px] text-muted-foreground">{q.marks} marks</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-primary" onClick={() => { setActiveTestForQuestion(paper.id); setEditingQuestion(q); setQuestionDialogOpen(true); }}>
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => setConfirmDelete({ type: 'question', id: q.id })}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Helper renderer for all modals
  function renderDialogs() {
    return (
      <>
        {/* CREATE EXAM MODAL */}
        <Dialog open={examCreateOpen} onOpenChange={setExamCreateOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-bold text-lg text-slate-900">Create New Exam</DialogTitle>
              <DialogDescription>
                Add a new competitive exam portal that will appear on the student Exam Dashboard.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveCreateExam} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Exam Short Title / Category</Label>
                <Input 
                  value={examCreateForm.name} 
                  onChange={e => setExamCreateForm(p => ({ ...p, name: e.target.value }))} 
                  required 
                  placeholder="e.g. AHO / ADH, ICAR JRF, Bank SO Agri" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Full Designation / Subtitle</Label>
                <Input 
                  value={examCreateForm.subtitle} 
                  onChange={e => setExamCreateForm(p => ({ ...p, subtitle: e.target.value }))} 
                  placeholder="e.g. Assistant Horticulture Officer & ADH" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Full Package Price (₹)</Label>
                <Input 
                  type="number" 
                  value={examCreateForm.price} 
                  onChange={e => setExamCreateForm(p => ({ ...p, price: e.target.value }))} 
                  required 
                  min={0} 
                  placeholder="3000" 
                />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl">
                Create Exam
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* EDIT EXAM MODAL */}
        <Dialog open={examEditOpen} onOpenChange={setExamEditOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-bold text-lg text-slate-900">Edit Exam Details</DialogTitle>
              <DialogDescription>
                Update name, subtitle or subscription price for this exam.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEditExam} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Exam Name</Label>
                <Input 
                  value={examEditForm.name} 
                  onChange={e => setExamEditForm(p => ({ ...p, name: e.target.value }))} 
                  required 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Full Designation / Subtitle</Label>
                <Input 
                  value={examEditForm.subtitle} 
                  onChange={e => setExamEditForm(p => ({ ...p, subtitle: e.target.value }))} 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Package Price (₹)</Label>
                <Input 
                  type="number" 
                  value={examEditForm.price} 
                  onChange={e => setExamEditForm(p => ({ ...p, price: e.target.value }))} 
                  required 
                  min={0} 
                />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl">
                Save Changes
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* CREATE / EDIT SECTION MODAL */}
        <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-bold text-lg text-slate-900">
                {editingSubject?.id ? 'Edit Section' : 'Add New Section'}
              </DialogTitle>
              <DialogDescription>
                Create or customize a mock test section (e.g. Important Papers, BSc Agri Special, General Studies, Horticulture Discipline) under this exam portal.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveSubject} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Section Title</Label>
                <Input 
                  value={subjectForm.name} 
                  onChange={e => setSubjectForm(p => ({ ...p, name: e.target.value }))} 
                  required 
                  placeholder="e.g. Important Papers, General Studies, Topic Tests" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Description / Syllabus Scope</Label>
                <Textarea 
                  value={subjectForm.subtitle} 
                  onChange={e => setSubjectForm(p => ({ ...p, subtitle: e.target.value }))} 
                  placeholder="e.g. Comprehensive high-priority question sets for General Knowledge and BSc Agri" 
                  className="min-h-[70px] text-xs" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Badge Tag</Label>
                  <Input 
                    value={subjectForm.badge} 
                    onChange={e => setSubjectForm(p => ({ ...p, badge: e.target.value }))} 
                    placeholder="e.g. High Yield Series, Core Mocks" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Access Mode</Label>
                  <Select 
                    value={subjectForm.is_free ? 'free' : 'paid'} 
                    onValueChange={v => setSubjectForm(p => ({ ...p, is_free: v === 'free' }))}
                  >
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid" className="text-xs font-bold text-amber-700">Paid Section</SelectItem>
                      <SelectItem value="free" className="text-xs font-bold text-emerald-700">Free Section</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl">
                {editingSubject?.id ? 'Save Section Changes' : 'Create Section'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* PAPER CREATE / EDIT MODAL */}
        <Dialog open={paperDialogOpen} onOpenChange={setPaperDialogOpen}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-bold text-lg text-slate-900">
                {editingPaper ? 'Edit Paper Details' : `Add Paper to ${paperForm.category}`}
              </DialogTitle>
              <DialogDescription>
                {paperForm.is_free ? 'This paper will be free for all registered students.' : `This paper is part of the ${paperForm.category} subscription.`}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSavePaper} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Paper Title</Label>
                <Input 
                  value={paperForm.title} 
                  onChange={e => setPaperForm(p => ({ ...p, title: e.target.value }))} 
                  required 
                  placeholder="e.g. Full Length Mock Test - 01" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Description / Syllabus Scope</Label>
                <Textarea 
                  value={paperForm.description} 
                  onChange={e => setPaperForm(p => ({ ...p, description: e.target.value }))} 
                  placeholder="Details about syllabus coverage, total marks, negative marking..." 
                  className="min-h-[70px] text-xs" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Subject / Section</Label>
                  {selectedExamId ? (
                    <Select
                      value={paperForm.category}
                      onValueChange={v => {
                        const activeExam = examsList.find(e => e.id === selectedExamId) || defaultAoExam;
                        const matchedSec = getExamSubjectSections(activeExam).find(s => s.categoryTag === v || s.title === v);
                        setPaperForm(p => ({
                          ...p,
                          category: v,
                          is_free: matchedSec ? matchedSec.isFree : p.is_free,
                          price: (matchedSec && matchedSec.isFree) ? '0' : p.price
                        }));
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                      <SelectContent>
                        {getExamSubjectSections(examsList.find(e => e.id === selectedExamId) || defaultAoExam).map(s => (
                          <SelectItem key={s.id} value={s.categoryTag} className="text-xs">
                            {s.title} {s.isFree ? '(Free)' : '(Paid)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      value={paperForm.category} 
                      onChange={e => setPaperForm(p => ({ ...p, category: e.target.value }))} 
                      required 
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Access Type</Label>
                  <Select 
                    value={paperForm.is_free ? 'free' : 'paid'} 
                    onValueChange={v => setPaperForm(p => ({ ...p, is_free: v === 'free', price: v === 'free' ? '0' : p.price }))}
                  >
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free" className="text-xs font-bold text-emerald-700">Free Paper</SelectItem>
                      <SelectItem value="paid" className="text-xs font-bold text-amber-700">Paid / Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                  Target Exams (Also Show in Other Exam Portals)
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  {examsList.map(ex => {
                    const isChecked = (paperForm.linked_exams || []).some(
                      l => l.toLowerCase().trim() === ex.name.toLowerCase().trim() || l.toLowerCase().trim() === ex.id.toLowerCase().trim()
                    );
                    return (
                      <label key={ex.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setPaperForm(p => {
                              const list = p.linked_exams || [];
                              if (checked) {
                                return { ...p, linked_exams: [...list, ex.name] };
                              } else {
                                return { ...p, linked_exams: list.filter(x => x.toLowerCase().trim() !== ex.name.toLowerCase().trim() && x.toLowerCase().trim() !== ex.id.toLowerCase().trim()) };
                              }
                            });
                          }}
                          className="w-3.5 h-3.5 accent-emerald-600 rounded"
                        />
                        <span className="truncate">{ex.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="paper_is_active" 
                  checked={paperForm.is_active} 
                  onChange={e => setPaperForm(p => ({ ...p, is_active: e.target.checked }))} 
                  className="w-4 h-4 accent-emerald-600 rounded" 
                />
                <Label htmlFor="paper_is_active" className="cursor-pointer text-xs font-medium">
                  Active (make immediately visible on student exam dashboard)
                </Label>
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl">
                {editingPaper ? 'Update Paper' : 'Save Paper'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* LINK / SHARE PAPERS ACROSS EXAMS MODAL */}
        <Dialog open={linkPapersDialogOpen} onOpenChange={setLinkPapersDialogOpen}>
          <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] flex flex-col p-6">
            <DialogHeader>
              <DialogTitle className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-600" />
                {linkTargetSectionTitle 
                  ? `Link Papers into "${linkTargetSectionTitle}" (${linkTargetExam})` 
                  : `Link Papers into ${linkTargetExam}`
                }
              </DialogTitle>
              <DialogDescription>
                {linkTargetSectionTitle
                  ? `Select papers from other subjects or exams to link specifically into the "${linkTargetSectionTitle}" section of ${linkTargetExam}.`
                  : `Select papers from other exams to make them available inside ${linkTargetExam}.`
                }
              </DialogDescription>
            </DialogHeader>

            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={linkSearchQuery}
                  onChange={e => setLinkSearchQuery(e.target.value)}
                  placeholder="Search papers by title..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs h-9 rounded-xl font-semibold"
                  onClick={() => {
                    const allFiltered = tests.filter(t => 
                      t.title !== '_SUBJECT_PLACEHOLDER_' && 
                      t.title !== '_SUBJECT_SECTION_' &&
                      (!linkSearchQuery.trim() || t.title.toLowerCase().includes(linkSearchQuery.toLowerCase()))
                    ).map(t => t.id);
                    const allSelected = allFiltered.every(id => selectedTestIdsToLink.includes(id));
                    if (allSelected) {
                      setSelectedTestIdsToLink(p => p.filter(id => !allFiltered.includes(id)));
                    } else {
                      setSelectedTestIdsToLink(p => Array.from(new Set([...p, ...allFiltered])));
                    }
                  }}
                >
                  Select / Deselect Shown
                </Button>
              </div>
            </div>

            {/* Paper List */}
            <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 max-h-[50vh]">
              {tests
                .filter(t => t.title !== '_SUBJECT_PLACEHOLDER_' && t.title !== '_SUBJECT_SECTION_')
                .filter(t => !linkSearchQuery.trim() || t.title.toLowerCase().includes(linkSearchQuery.toLowerCase()) || (t.description && t.description.toLowerCase().includes(linkSearchQuery.toLowerCase())))
                .map(paper => {
                  const isSelected = selectedTestIdsToLink.includes(paper.id);
                  const linked = getLinkedExams(paper);
                  const isNativeInTarget = (paper.category || '').toLowerCase().trim() === linkTargetExam.toLowerCase().trim();

                  return (
                    <div
                      key={paper.id}
                      onClick={() => {
                        setSelectedTestIdsToLink(prev => 
                          prev.includes(paper.id) ? prev.filter(x => x !== paper.id) : [...prev, paper.id]
                        );
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50/40' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">{paper.title}</span>
                            {paper.is_free ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[9px] font-bold">Free</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-900 border-0 text-[9px] font-bold">Paid</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            Category: {paper.category || 'General'}
                            {linked.length > 0 && ` • In exams: ${linked.join(', ')}`}
                          </p>
                        </div>
                      </div>

                      {isNativeInTarget ? (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                          Native in {linkTargetExam}
                        </span>
                      ) : isSelected ? (
                        <span className="text-[10px] text-indigo-700 bg-indigo-100 font-bold px-2 py-0.5 rounded shrink-0">
                          Linked to {linkTargetSectionTitle ? `"${linkTargetSectionTitle}"` : linkTargetExam}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">
                {selectedTestIdsToLink.length} papers selected for {linkTargetSectionTitle ? `"${linkTargetSectionTitle}"` : linkTargetExam}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setLinkPapersDialogOpen(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveLinkPapers} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs px-4"
                >
                  Save Linked Papers
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* DELETE SECTION CONFIRM */}
        <AlertDialog open={!!confirmDeleteSubject} onOpenChange={o => !o && setConfirmDeleteSubject(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Section "{confirmDeleteSubject?.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete this section card. Any papers previously inside this section will remain in the exam portal and can be linked or reassigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                onClick={() => {
                  if (confirmDeleteSubject) {
                    handleDeleteSubject(
                      confirmDeleteSubject.id, 
                      confirmDeleteSubject.name, 
                      confirmDeleteSubject.categoryTag,
                      confirmDeleteSubject.sectionTestId
                    );
                  }
                }}
              >
                Delete Section
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* QUESTION DIALOG & BULK UPLOAD */}
        {questionDialogOpen && activeTestForQuestion && (
          <QuestionDialog
            open={questionDialogOpen}
            onOpenChange={setQuestionDialogOpen}
            testId={activeTestForQuestion}
            editingQuestion={editingQuestion}
            onSaved={(q) => onQuestionSaved(q as Question, activeTestForQuestion)}
          />
        )}

        {bulkUploadOpen && bulkTestId && (
          <BulkUploadDialog
            open={bulkUploadOpen}
            onOpenChange={setBulkUploadOpen}
            testId={bulkTestId}
            onUploaded={(qs) => {
              setQuestions(p => ({ ...p, [bulkTestId]: [...(p[bulkTestId] || []), ...qs] }));
              toast.success(`${qs.length} questions uploaded!`);
            }}
          />
        )}

        {/* DELETE EXAM CONFIRM */}
        <AlertDialog open={!!confirmDeleteExam} onOpenChange={o => !o && setConfirmDeleteExam(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Exam "{confirmDeleteExam}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this exam and all its associated mock papers and questions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                onClick={() => { if (confirmDeleteExam) handleDeleteExam(confirmDeleteExam); }}
              >
                Delete Exam
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* DELETE PAPER / QUESTION CONFIRM */}
        <AlertDialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDelete?.type === 'test'
                  ? 'This will permanently delete this paper and ALL its questions.'
                  : 'This will permanently delete this question.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                onClick={() => {
                  if (!confirmDelete) return;
                  if (confirmDelete.type === 'test') handleDeleteTest(confirmDelete.id);
                  else {
                    const testId = Object.entries(questions).find(([, qs]) => qs.some(q => q.id === confirmDelete.id))?.[0];
                    if (testId) handleDeleteQuestion(confirmDelete.id, Number(testId));
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
}
