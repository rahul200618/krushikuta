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
import { Plus, Trash2, Edit3, ChevronRight, ChevronDown, Loader2, Eye, EyeOff, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface MockTest {
  id: number; title: string; description: string; category: string;
  price: number; image_url?: string; is_active: boolean;
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

  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<MockTest | null>(null);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [activeTestForQuestion, setActiveTestForQuestion] = useState<number | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkTestId, setBulkTestId] = useState<number | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ type: 'test' | 'question'; id: number } | null>(null);

  const [testForm, setTestForm] = useState({
    title: '', description: '', category: 'General', price: '0',
    image_url: '', is_active: true,
  });

  useEffect(() => { fetchTests(); }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await listMockTests();
      setTests(res.tests || []);
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

  const openCreateTest = () => {
    setEditingTest(null);
    setTestForm({ title: '', description: '', category: 'General', price: '0', image_url: '', is_active: true });
    setTestDialogOpen(true);
  };

  const openEditTest = (test: MockTest) => {
    setEditingTest(test);
    setTestForm({ title: test.title, description: test.description || '', category: test.category || 'General', price: String(test.price), image_url: test.image_url || '', is_active: test.is_active });
    setTestDialogOpen(true);
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editingTest ? { id: editingTest.id } : {}),
        title: testForm.title,
        description: testForm.description,
        category: testForm.category,
        price: parseFloat(testForm.price) || 0,
        image_url: testForm.image_url || null,
        is_active: testForm.is_active,
      };
      const res = await saveMockTest(payload);
      if (editingTest) {
        setTests(p => p.map(t => t.id === editingTest.id ? res.test : t));
      } else {
        setTests(p => [res.test, ...p]);
      }
      setTestDialogOpen(false);
      toast.success(editingTest ? 'Test updated!' : 'Test created!');
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  const handleDeleteTest = async (id: number) => {
    try {
      await deleteMockTest(id);
      setTests(p => p.filter(t => t.id !== id));
      toast.success('Test deleted');
    } catch { toast.error('Failed to delete test'); }
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

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Exams ({tests.length})</h3>
        <Button className="gradient-primary" onClick={openCreateTest}>
          <Plus className="w-4 h-4 mr-2" /> New Test
        </Button>
      </div>

      {tests.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl">
          No exams yet. Create your first one!
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map(test => (
            <Card key={test.id} className="overflow-hidden border-border">
              {/* Test header */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => toggleExpand(test.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold truncate">{test.title}</span>
                    <Badge variant={test.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {test.is_active ? <><Eye className="w-3 h-3 mr-1" />Active</> : <><EyeOff className="w-3 h-3 mr-1" />Draft</>}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{test.category}</Badge>
                    {test.price > 0 && <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">₹{test.price}</Badge>}
                  </div>
                  {test.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{test.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEditTest(test); }} className="text-primary w-8 h-8">
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setConfirmDelete({ type: 'test', id: test.id }); }} className="text-destructive w-8 h-8">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  {expandedTest === test.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Questions panel */}
              {expandedTest === test.id && (
                <div className="border-t border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Questions ({qLoading === test.id ? '…' : (questions[test.id] || []).length})
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => { setBulkTestId(test.id); setBulkUploadOpen(true); }}>
                        <Upload className="w-3 h-3 mr-1.5" />Bulk Upload
                      </Button>
                      <Button size="sm" className="gradient-primary text-xs" onClick={() => { setActiveTestForQuestion(test.id); setEditingQuestion(null); setQuestionDialogOpen(true); }}>
                        <Plus className="w-3 h-3 mr-1.5" />Add Question
                      </Button>
                    </div>
                  </div>

                  {qLoading === test.id ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                  ) : (questions[test.id] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No questions yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {(questions[test.id] || []).map((q, idx) => (
                        <div key={q.id} className="flex items-start gap-3 bg-card p-3 rounded-xl border border-border">
                          <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2">{q.question_text}</p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{q.topic}</span>
                              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ans: {String.fromCharCode(65 + q.correct_option_index)}</span>
                              <span className="text-[10px] text-muted-foreground">{q.marks} marks</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-primary" onClick={() => { setActiveTestForQuestion(test.id); setEditingQuestion(q); setQuestionDialogOpen(true); }}>
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
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Test Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTest ? 'Edit Exam' : 'Create Exam'}</DialogTitle>
            <DialogDescription>Fill in the test details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTest} className="space-y-4 pt-2">
            <div className="space-y-1"><Label>Title</Label><Input value={testForm.title} onChange={e => setTestForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g. Agriculture Practical Paper 1" /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={testForm.description} onChange={e => setTestForm(p => ({ ...p, description: e.target.value }))} placeholder="Short description..." className="min-h-[60px]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Subject</Label>
                <Input value={testForm.category} onChange={e => setTestForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Horticulture" list="subjects-list" />
                <datalist id="subjects-list">
                  {DEFAULT_SUBJECTS.map(c => <option key={c} value={c} />)}
                  {Array.from(new Set(tests.map(t => t.category).filter(c => !DEFAULT_SUBJECTS.includes(c)))).map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-1"><Label>Price (₹)</Label><Input type="number" value={testForm.price} onChange={e => setTestForm(p => ({ ...p, price: e.target.value }))} min={0} placeholder="0 for free" /></div>
            </div>
            <div className="space-y-1"><Label>Cover Image URL (optional)</Label><Input value={testForm.image_url} onChange={e => setTestForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." /></div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_active" checked={testForm.is_active} onChange={e => setTestForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 accent-primary" />
              <Label htmlFor="is_active">Active (visible to students)</Label>
            </div>
            <Button type="submit" className="w-full gradient-primary">{editingTest ? 'Update Test' : 'Create Test'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      {questionDialogOpen && activeTestForQuestion && (
        <QuestionDialog
          open={questionDialogOpen}
          onOpenChange={setQuestionDialogOpen}
          testId={activeTestForQuestion}
          editingQuestion={editingQuestion}
          onSaved={(q) => onQuestionSaved(q as Question, activeTestForQuestion)}
        />
      )}

      {/* Bulk Upload Dialog */}
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

      {/* Delete Confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.type === 'test'
                ? 'This will permanently delete the test and ALL its questions.'
                : 'This will permanently delete this question.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => {
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
    </div>
  );
}
