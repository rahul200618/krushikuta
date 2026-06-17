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
import { Plus, Trash2, Edit3, ChevronRight, ChevronDown, Loader2, Eye, EyeOff, Upload, Folder, BookOpen, Lock, Unlock, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface MockTest {
  id: number; title: string; description: string; category: string;
  price: number; image_url?: string; is_active: boolean; is_free?: boolean;
  popup_message?: string;
}

interface Question {
  id: number; mock_test_id: number; question_text: string; options: string[];
  correct_option_index: number; marks: number; topic: string; image_url?: string;
}

const DEFAULT_SUBJECTS = ['Practical Exam', 'General', 'AO/AAO', 'ICAR', 'Horticulture', 'Agriculture Officer'];

export function ExamEditorPanel() {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTest, setExpandedTest] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Record<number, Question[]>>({});
  const [qLoading, setQLoading] = useState<number | null>(null);

  // Toggle layout tabs
  const [activeTab, setActiveTab] = useState<'free' | 'paid'>('free');

  // Modals state & forms
  const [freeDialogOpen, setFreeDialogOpen] = useState(false);
  const [editingFreeTest, setEditingFreeTest] = useState<MockTest | null>(null);
  const [freeForm, setFreeForm] = useState({
    title: '', description: '', category: 'General', image_url: '', is_active: true
  });

  const [subjectCreateOpen, setSubjectCreateOpen] = useState(false);
  const [subjectCreateForm, setSubjectCreateForm] = useState({
    subjectName: '', price: '3000', firstPaperTitle: 'Paper 1', description: ''
  });

  const [subjectEditOpen, setSubjectEditOpen] = useState(false);
  const [editingSubjectCategory, setEditingSubjectCategory] = useState('');
  const [subjectEditForm, setSubjectEditForm] = useState({
    subjectName: '', price: '3000'
  });

  const [confirmDeleteSubject, setConfirmDeleteSubject] = useState<string | null>(null);

  const [paidPaperDialogOpen, setPaidPaperDialogOpen] = useState(false);
  const [editingPaidPaper, setEditingPaidPaper] = useState<MockTest | null>(null);
  const [paidPaperForm, setPaidPaperForm] = useState({
    title: '', description: '', category: '', price: '3000', image_url: '', is_active: true,
    released_date: '', releasing_date: '', status: 'UPCOMING'
  });

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [activeTestForQuestion, setActiveTestForQuestion] = useState<number | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkTestId, setBulkTestId] = useState<number | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ type: 'test' | 'question'; id: number } | null>(null);

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

  // Open creation/edit forms
  const openCreateFreePaper = () => {
    setEditingFreeTest(null);
    setFreeForm({ title: '', description: '', category: 'General', image_url: '', is_active: true });
    setFreeDialogOpen(true);
  };

  const openEditFreePaper = (test: MockTest) => {
    setEditingFreeTest(test);
    setFreeForm({
      title: test.title,
      description: test.description || '',
      category: test.category || 'General',
      image_url: test.image_url || '',
      is_active: test.is_active
    });
    setFreeDialogOpen(true);
  };

  const openCreatePaidSubject = () => {
    setSubjectCreateForm({ subjectName: '', price: '3000', firstPaperTitle: 'Paper 1', description: '' });
    setSubjectCreateOpen(true);
  };

  const openEditSubject = (category: string, price: number) => {
    setEditingSubjectCategory(category);
    setSubjectEditForm({ subjectName: category, price: String(price) });
    setSubjectEditOpen(true);
  };

  const openAddPaperToSubject = (category: string, price: number) => {
    setEditingPaidPaper(null);
    setPaidPaperForm({
      title: '', description: '', category, price: String(price), image_url: '', is_active: true,
      released_date: new Date().toLocaleDateString('en-GB'), releasing_date: '-', status: 'RELEASED'
    });
    setPaidPaperDialogOpen(true);
  };

  const openEditPaidPaper = (paper: MockTest) => {
    setEditingPaidPaper(paper);
    let sched = { released_date: '', releasing_date: '', status: 'UPCOMING' };
    try {
      if (paper.popup_message && paper.popup_message.startsWith('{')) {
        sched = JSON.parse(paper.popup_message);
      }
    } catch (e) { /* ignore */ }
    setPaidPaperForm({
      title: paper.title,
      description: paper.description || '',
      category: paper.category,
      price: String(paper.price),
      image_url: paper.image_url || '',
      is_active: paper.is_active,
      ...sched
    });
    setPaidPaperDialogOpen(true);
  };

  // Submit handlers
  const handleSaveFreePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editingFreeTest ? { id: editingFreeTest.id } : {}),
        title: freeForm.title,
        description: freeForm.description,
        category: freeForm.category,
        price: 0,
        is_free: true,
        image_url: freeForm.image_url || null,
        is_active: freeForm.is_active,
        popup_message: null
      };
      const res = await saveMockTest(payload);
      if (editingFreeTest) {
        setTests(p => p.map(t => t.id === editingFreeTest.id ? res.test : t));
        toast.success('Free paper updated!');
      } else {
        setTests(p => [res.test, ...p]);
        toast.success('Free paper created!');
      }
      setFreeDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save free paper');
    }
  };

  const handleSavePaidSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const subName = subjectCreateForm.subjectName.trim();
    const firstTitle = subjectCreateForm.firstPaperTitle.trim();
    if (!subName || !firstTitle) {
      toast.error('Subject Name and First Paper Title are required');
      return;
    }
    try {
      const payload = {
        title: firstTitle,
        description: subjectCreateForm.description,
        category: subName,
        price: parseFloat(subjectCreateForm.price) || 0,
        is_free: false,
        is_active: true,
        popup_message: JSON.stringify({
          released_date: new Date().toLocaleDateString('en-GB'),
          releasing_date: '-',
          status: 'RELEASED'
        })
      };
      const res = await saveMockTest(payload);
      setTests(p => [res.test, ...p]);
      toast.success(`Paid Subject "${subName}" created with its first paper!`);
      setSubjectCreateOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create subject');
    }
  };

  const handleSaveSubjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newName = subjectEditForm.subjectName.trim();
    const newPrice = parseFloat(subjectEditForm.price) || 0;
    if (!newName) {
      toast.error('Subject Name is required');
      return;
    }
    setLoading(true);
    try {
      const papersToUpdate = tests.filter(t => t.category === editingSubjectCategory);
      const updated = await Promise.all(papersToUpdate.map(async (t) => {
        const payload = {
          ...t,
          category: newName,
          price: newPrice
        };
        const res = await saveMockTest(payload);
        return res.test;
      }));
      setTests(p => p.map(t => {
        const up = updated.find(x => x.id === t.id);
        return up ? up : t;
      }));
      toast.success('Subject and all its papers updated!');
      setSubjectEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update subject');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (category: string) => {
    setLoading(true);
    try {
      const papersToDelete = tests.filter(t => t.category === category);
      await Promise.all(papersToDelete.map(t => deleteMockTest(t.id)));
      setTests(p => p.filter(t => t.category !== category));
      toast.success(`Subject "${category}" and all its papers deleted.`);
      setConfirmDeleteSubject(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete subject');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaidPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editingPaidPaper ? { id: editingPaidPaper.id } : {}),
        title: paidPaperForm.title,
        description: paidPaperForm.description,
        category: paidPaperForm.category,
        price: parseFloat(paidPaperForm.price) || 0,
        is_free: false,
        image_url: paidPaperForm.image_url || null,
        is_active: paidPaperForm.is_active,
        popup_message: JSON.stringify({
          released_date: paidPaperForm.released_date,
          releasing_date: paidPaperForm.releasing_date,
          status: paidPaperForm.status
        })
      };
      const res = await saveMockTest(payload);
      if (editingPaidPaper) {
        setTests(p => p.map(t => t.id === editingPaidPaper.id ? res.test : t));
        toast.success('Paper updated!');
      } else {
        setTests(p => [res.test, ...p]);
        toast.success('Paper added to subject!');
      }
      setPaidPaperDialogOpen(false);
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

  const parseSchedule = (test: MockTest) => {
    try {
      if (test.popup_message && test.popup_message.startsWith('{')) {
        return JSON.parse(test.popup_message);
      }
    } catch { }
    return { released_date: '-', releasing_date: '-', status: 'UPCOMING' };
  };

  const handleReleaseNow = async (paper: MockTest) => {
    try {
      const payload = {
        ...paper,
        popup_message: JSON.stringify({
          released_date: new Date().toLocaleDateString('en-GB'),
          releasing_date: '-',
          status: 'RELEASED'
        })
      };
      const res = await saveMockTest(payload);
      setTests(p => p.map(t => t.id === paper.id ? res.test : t));
      toast.success(`"${paper.title}" is now RELEASED!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to release paper');
    }
  };

  // Grouping structures
  const freeTests = tests.filter(t => t.is_free || t.price === 0);
  const paidTests = tests.filter(t => !t.is_free && t.price > 0);

  // Group paid tests by subject name (category)
  const subjectsMap: Record<string, { category: string; price: number; papers: MockTest[] }> = {};
  paidTests.forEach(test => {
    if (!subjectsMap[test.category]) {
      subjectsMap[test.category] = { category: test.category, price: test.price, papers: [] };
    }
    subjectsMap[test.category].papers.push(test);
  });
  const paidSubjects = Object.values(subjectsMap);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Headline */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h3 className="text-xl font-bold font-serif text-slate-800">AO/AAO Content Manager</h3>
          <p className="text-xs text-muted-foreground mt-1">Manage mock test question papers, subjects, and questions</p>
        </div>
        
        <div className="flex bg-muted p-1 rounded-xl shrink-0 self-start md:self-auto border">
          <Button 
            variant={activeTab === 'free' ? 'default' : 'ghost'} 
            size="sm" 
            className="rounded-lg text-xs font-semibold px-4"
            onClick={() => { setActiveTab('free'); setExpandedTest(null); }}
          >
            <Unlock className="w-3.5 h-3.5 mr-1.5" /> Free Exams
          </Button>
          <Button 
            variant={activeTab === 'paid' ? 'default' : 'ghost'} 
            size="sm" 
            className="rounded-lg text-xs font-semibold px-4"
            onClick={() => { setActiveTab('paid'); setExpandedTest(null); }}
          >
            <Lock className="w-3.5 h-3.5 mr-1.5" /> Paid Subjects & Papers
          </Button>
        </div>
      </div>

      {/* Free Exams Tab */}
      {activeTab === 'free' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-700 flex items-center gap-2">
              <Unlock className="w-4 h-4 text-green-600" /> Free Exam Papers ({freeTests.length})
            </h4>
            <Button className="gradient-primary text-xs" size="sm" onClick={openCreateFreePaper}>
              <Plus className="w-4 h-4 mr-1.5" /> New Free Exam Paper
            </Button>
          </div>

          {freeTests.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl">
              No free exam papers yet. Create your first free mock test!
            </div>
          ) : (
            <div className="space-y-3">
              {freeTests.map(paper => (
                <Card key={paper.id} className="overflow-hidden border-border hover:shadow-soft transition-all">
                  {/* Paper header */}
                  <div className="flex items-center justify-between gap-4 p-4 hover:bg-muted/10 cursor-pointer" onClick={() => toggleExpand(paper.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-sm">{paper.title}</span>
                        <Badge variant={paper.is_active ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0">
                          {paper.is_active ? <><Eye className="w-3 h-3 mr-1" />Active</> : <><EyeOff className="w-3 h-3 mr-1" />Draft</>}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-green-200 bg-green-50 text-green-700">{paper.category}</Badge>
                      </div>
                      {paper.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{paper.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => openEditFreePaper(paper)} className="text-primary w-8 h-8">
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setConfirmDelete({ type: 'test', id: paper.id })} className="text-destructive w-8 h-8">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleExpand(paper.id)} className="w-8 h-8 text-muted-foreground">
                        {expandedTest === paper.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded questions list */}
                  {expandedTest === paper.id && renderQuestionsSection(paper.id)}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Paid Subjects & Papers Tab */}
      {activeTab === 'paid' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-700 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" /> Paid Subjects ({paidSubjects.length})
            </h4>
            <Button className="gradient-primary text-xs" size="sm" onClick={openCreatePaidSubject}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Paid Subject
            </Button>
          </div>

          {paidSubjects.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl">
              No paid subjects yet. Click "Create Paid Subject" to add a new category bundle.
            </div>
          ) : (
            <div className="space-y-6">
              {paidSubjects.map(sub => (
                <Card key={sub.category} className="border-border shadow-elegant overflow-hidden bg-white">
                  {/* Subject Title Header */}
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-800 leading-snug">{sub.category}</h5>
                        <p className="text-xs text-muted-foreground">{sub.papers.length} Papers in Subject</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-xs font-semibold py-1 px-2.5">
                        ₹{sub.price} All Access
                      </Badge>
                      <Button variant="outline" size="sm" className="h-8 text-xs font-medium" onClick={() => openAddPaperToSubject(sub.category, sub.price)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Paper
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-primary border" onClick={() => openEditSubject(sub.category, sub.price)}>
                        <Settings className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive border hover:bg-destructive/5" onClick={() => setConfirmDeleteSubject(sub.category)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* List of papers under Subject */}
                  <div className="p-4 bg-slate-50/30 divide-y divide-slate-100">
                    {sub.papers.map(paper => {
                      const sched = parseSchedule(paper);
                      const isReleased = sched.status === 'RELEASED';
                      return (
                        <div key={paper.id} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-center justify-between gap-4 p-2 hover:bg-muted/10 rounded-xl transition-all cursor-pointer" onClick={() => toggleExpand(paper.id)}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground animate-pulse" />
                                  {paper.title}
                                </span>
                                <Badge variant={paper.is_active ? 'default' : 'secondary'} className="text-[9px] px-1 py-0 h-4">
                                  {paper.is_active ? 'Active' : 'Draft'}
                                </Badge>
                                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-0 font-bold ${isReleased ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                  {isReleased ? `Released: ${sched.released_date}` : `Releasing on: ${sched.releasing_date}`}
                                </Badge>
                              </div>
                              {paper.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1 ml-5">{paper.description}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                              {!isReleased && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 font-bold px-2.5 rounded-lg"
                                  onClick={() => handleReleaseNow(paper)}
                                >
                                  Release Now
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => openEditPaidPaper(paper)} className="text-primary w-7 h-7">
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setConfirmDelete({ type: 'test', id: paper.id })} className="text-destructive w-7 h-7">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => toggleExpand(paper.id)} className="w-7 h-7 text-muted-foreground">
                                {expandedTest === paper.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>

                          {/* Expand questions inside paid paper */}
                          {expandedTest === paper.id && (
                            <div className="mt-3 ml-4">
                              {renderQuestionsSection(paper.id)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Render Common Question dialogues */}
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

      {/* Free Exam Paper Create/Edit Dialog */}
      <Dialog open={freeDialogOpen} onOpenChange={setFreeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFreeTest ? 'Edit Free Exam Paper' : 'Create Free Exam Paper'}</DialogTitle>
            <DialogDescription>Create a mock test paper that is available to students for free.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveFreePaper} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Paper Title</Label>
              <Input value={freeForm.title} onChange={e => setFreeForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g. Free Agriculture Officer Practice Paper" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={freeForm.description} onChange={e => setFreeForm(p => ({ ...p, description: e.target.value }))} placeholder="Provide details about the mock test..." className="min-h-[70px]" />
            </div>
            <div className="space-y-1">
              <Label>Subject / Category Tag</Label>
              <Input value={freeForm.category} onChange={e => setFreeForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Practical Exam, General" list="free-subjects-list" />
              <datalist id="free-subjects-list">
                {DEFAULT_SUBJECTS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label>Cover Image URL (optional)</Label>
              <Input value={freeForm.image_url} onChange={e => setFreeForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input type="checkbox" id="free_is_active" checked={freeForm.is_active} onChange={e => setFreeForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 accent-primary" />
              <Label htmlFor="free_is_active" className="cursor-pointer">Active (make visible on Free Mock Tests page)</Label>
            </div>
            <Button type="submit" className="w-full gradient-primary">{editingFreeTest ? 'Update Paper' : 'Create Paper'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Paid Subject Create Dialog */}
      <Dialog open={subjectCreateOpen} onOpenChange={setSubjectCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Paid Subject Bundle</DialogTitle>
            <DialogDescription>This creates a new Paid Subject (Category) and sets up its first Paper.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePaidSubject} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Subject Name</Label>
                <Input value={subjectCreateForm.subjectName} onChange={e => setSubjectCreateForm(p => ({ ...p, subjectName: e.target.value }))} required placeholder="e.g. Horticulture" list="paid-subjects-list" />
                <datalist id="paid-subjects-list">
                  {DEFAULT_SUBJECTS.filter(s => s !== 'General').map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-1">
                <Label>All-Access Price (₹)</Label>
                <Input type="number" value={subjectCreateForm.price} onChange={e => setSubjectCreateForm(p => ({ ...p, price: e.target.value }))} required min={0} placeholder="3000" />
              </div>
            </div>
            
            <div className="space-y-1 border-t border-border pt-3">
              <p className="text-xs font-bold text-amber-700 mb-2">First Paper Details</p>
              <Label>First Paper Title</Label>
              <Input value={subjectCreateForm.firstPaperTitle} onChange={e => setSubjectCreateForm(p => ({ ...p, firstPaperTitle: e.target.value }))} required placeholder="e.g. Paper 1: General Crop Husbandry" />
            </div>
            <div className="space-y-1">
              <Label>Paper Description</Label>
              <Textarea value={subjectCreateForm.description} onChange={e => setSubjectCreateForm(p => ({ ...p, description: e.target.value }))} placeholder="Provide details about the paper..." className="min-h-[60px]" />
            </div>
            <Button type="submit" className="w-full gradient-primary">Create Subject & Paper</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Paid Subject Edit Dialog */}
      <Dialog open={subjectEditOpen} onOpenChange={setSubjectEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subject Bundle</DialogTitle>
            <DialogDescription>
              Renaming or updating price here will modify all papers currently grouped under <span className="font-bold text-slate-800">"{editingSubjectCategory}"</span>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSubjectEdit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Subject Name</Label>
              <Input value={subjectEditForm.subjectName} onChange={e => setSubjectEditForm(p => ({ ...p, subjectName: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>All-Access Price (₹)</Label>
              <Input type="number" value={subjectEditForm.price} onChange={e => setSubjectEditForm(p => ({ ...p, price: e.target.value }))} min={0} required />
            </div>
            <Button type="submit" className="w-full">Update Subject Bundle</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Paid Paper Create/Edit Dialog */}
      <Dialog open={paidPaperDialogOpen} onOpenChange={setPaidPaperDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPaidPaper ? 'Edit Paper details' : 'Add Paper to Subject'}</DialogTitle>
            <DialogDescription>
              Creating paper under Paid Subject: <span className="font-bold text-slate-800">"{paidPaperForm.category}"</span> (Price: ₹{paidPaperForm.price}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePaidPaper} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Paper Title</Label>
              <Input value={paidPaperForm.title} onChange={e => setPaidPaperForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g. Paper 2: Fruit and Vegetable Science" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={paidPaperForm.description} onChange={e => setPaidPaperForm(p => ({ ...p, description: e.target.value }))} placeholder="Provide details about the paper..." className="min-h-[70px]" />
            </div>
            <div className="space-y-1">
              <Label>Cover Image URL (optional)</Label>
              <Input value={paidPaperForm.image_url} onChange={e => setPaidPaperForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." />
            </div>

            {/* Premium Schedule Settings */}
            <div className="p-3 bg-muted/40 rounded-xl space-y-3 border border-border">
              <p className="text-xs font-bold text-primary flex items-center gap-1">
                Release Schedule Settings
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Released Date</Label>
                  <Input className="h-8 text-xs font-mono" value={paidPaperForm.released_date} onChange={e => setPaidPaperForm(p => ({ ...p, released_date: e.target.value }))} placeholder="e.g. 17/06/2026" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Releasing Date</Label>
                  <Input className="h-8 text-xs font-mono" value={paidPaperForm.releasing_date} onChange={e => setPaidPaperForm(p => ({ ...p, releasing_date: e.target.value }))} placeholder="e.g. -" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Release Status</Label>
                <Select value={paidPaperForm.status} onValueChange={v => setPaidPaperForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="RELEASED" className="text-xs">RELEASED</SelectItem>
                    <SelectItem value="UPCOMING" className="text-xs">UPCOMING</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input type="checkbox" id="paid_is_active" checked={paidPaperForm.is_active} onChange={e => setPaidPaperForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 accent-primary" />
              <Label htmlFor="paid_is_active" className="cursor-pointer">Active (make visible on premium schedule page)</Label>
            </div>
            
            <Button type="submit" className="w-full gradient-primary">{editingPaidPaper ? 'Update Paper' : 'Add Paper to Subject'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Paper Confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.type === 'test'
                ? 'This will permanently delete the paper and ALL its questions.'
                : 'This will permanently delete this question.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (!confirmDelete) return;
              if (confirmDelete.type === 'test') handleDeleteTest(confirmDelete.id);
              else {
                const testId = Object.entries(questions).find(([, qs]) => qs.some(q => q.id === confirmDelete.id))?.[0];
                if (testId) handleDeleteQuestion(confirmDelete.id, Number(testId));
              }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Subject Confirm */}
      <AlertDialog open={!!confirmDeleteSubject} onOpenChange={o => !o && setConfirmDeleteSubject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject Bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-bold text-slate-800">"{confirmDeleteSubject}"</span>?
              <br /><br />
              This will permanently delete <span className="font-bold text-destructive">ALL papers</span> and <span className="font-bold text-destructive">ALL questions</span> belonging to this subject. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (confirmDeleteSubject) handleDeleteSubject(confirmDeleteSubject);
            }}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // Helper helper to render questions panel inside tests
  function renderQuestionsSection(testId: number) {
    return (
      <div className="border-t border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            Questions ({qLoading === testId ? '…' : (questions[testId] || []).length})
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => { setBulkTestId(testId); setBulkUploadOpen(true); }}>
              <Upload className="w-3 h-3 mr-1.5" />Bulk Upload
            </Button>
            <Button size="sm" className="gradient-primary text-xs h-8" onClick={() => { setActiveTestForQuestion(testId); setEditingQuestion(null); setQuestionDialogOpen(true); }}>
              <Plus className="w-3 h-3 mr-1.5" />Add Question
            </Button>
          </div>
        </div>

        {qLoading === testId ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : (questions[testId] || []).length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No questions yet.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(questions[testId] || []).map((q, idx) => (
              <div key={q.id} className="flex items-start gap-3 bg-card p-3 rounded-xl border border-border">
                <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs line-clamp-2">{q.question_text}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{q.topic}</span>
                    <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ans: {String.fromCharCode(65 + q.correct_option_index)}</span>
                    <span className="text-[9px] text-muted-foreground">{q.marks} marks</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-primary" onClick={() => { setActiveTestForQuestion(testId); setEditingQuestion(q); setQuestionDialogOpen(true); }}>
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
    );
  }
}
