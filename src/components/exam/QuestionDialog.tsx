import { useState } from 'react';
import { saveMockQuestion } from '@/lib/exam-api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface QuestionDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  testId: number;
  editingQuestion?: Record<string, unknown> | null;
  onSaved: (q: unknown) => void;
}

const LETTER_MAP: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

export function QuestionDialog({ open, onOpenChange, testId, editingQuestion, onSaved }: QuestionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [formData, setFormData] = useState<{
    question_text: string; optA: string; optB: string; optC: string; optD: string;
    correct_option_index: string; marks: string; topic: string; image_url: string;
  }>(() => {
    if (editingQuestion) {
      const opts = editingQuestion.options as string[] || [];
      return {
        question_text: (editingQuestion.question_text as string) || '',
        optA: opts[0] || '', optB: opts[1] || '', optC: opts[2] || '', optD: opts[3] || '',
        correct_option_index: String(editingQuestion.correct_option_index ?? '0'),
        marks: String(editingQuestion.marks ?? '3'),
        topic: (editingQuestion.topic as string) || 'General',
        image_url: (editingQuestion.image_url as string) || '',
      };
    }
    return { question_text: '', optA: '', optB: '', optC: '', optD: '', correct_option_index: '0', marks: '3', topic: 'General', image_url: '' };
  });

  const set = (k: string, v: string) => setFormData(p => ({ ...p, [k]: v }));

  const uploadImage = async (file: File) => {
    setImageUploading(true);
    const ext = file.name.split('.').pop();
    const path = `exam-questions/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('public1').upload(path, file, { contentType: file.type });
    if (error) { toast.error('Image upload failed'); setImageUploading(false); return; }
    const { data } = supabase.storage.from('public1').getPublicUrl(path);
    set('image_url', data.publicUrl);
    setImageUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const question = {
        ...(editingQuestion?.id ? { id: editingQuestion.id } : {}),
        mock_test_id: testId,
        question_text: formData.question_text,
        options: [formData.optA, formData.optB, formData.optC, formData.optD],
        correct_option_index: parseInt(formData.correct_option_index),
        marks: parseInt(formData.marks) || 3,
        topic: formData.topic,
        image_url: formData.image_url || null,
      };
      const res = await saveMockQuestion(question);
      onSaved(res.question);
      onOpenChange(false);
      toast.success(editingQuestion ? 'Question updated!' : 'Question added!');
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add Question'}</DialogTitle>
          <DialogDescription>Fill in the question details and all four options.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Question Text</Label>
            <Textarea value={formData.question_text} onChange={e => set('question_text', e.target.value)} required className="min-h-[80px]" placeholder="Enter the question..." />
          </div>

          {/* Options */}
          {(['A', 'B', 'C', 'D'] as const).map(letter => (
            <div key={letter} className="space-y-1">
              <Label>Option {letter}</Label>
              <Input value={formData[`opt${letter}` as 'optA']} onChange={e => set(`opt${letter}`, e.target.value)} required placeholder={`Option ${letter}...`} />
            </div>
          ))}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Correct Answer</Label>
              <Select value={formData.correct_option_index} onValueChange={v => set('correct_option_index', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['A', 'B', 'C', 'D'].map((l, i) => (
                    <SelectItem key={l} value={String(i)}>Option {l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Marks</Label>
              <Input type="number" value={formData.marks} onChange={e => set('marks', e.target.value)} min={1} max={10} />
            </div>
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input value={formData.topic} onChange={e => set('topic', e.target.value)} placeholder="e.g. Agronomy" />
            </div>
          </div>

          {/* Image */}
          <div className="space-y-1">
            <Label>Question Image (optional)</Label>
            <div className="flex gap-2">
              <Input value={formData.image_url} onChange={e => set('image_url', e.target.value)} placeholder="Paste image URL or upload" className="flex-1" />
              <Button type="button" variant="outline" className="relative overflow-hidden shrink-0" disabled={imageUploading}>
                {imageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
              </Button>
            </div>
            {formData.image_url && <img src={formData.image_url} alt="Preview" className="mt-2 rounded-lg max-h-32 object-contain border border-border" />}
          </div>

          <Button type="submit" className="w-full gradient-primary" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {editingQuestion ? 'Update Question' : 'Add Question'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
