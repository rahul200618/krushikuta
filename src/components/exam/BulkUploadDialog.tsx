import { useState } from 'react';
import { saveMockQuestion } from '@/lib/exam-api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, UploadCloud, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set pdf.js worker src
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: number;
  onUploaded: (questions: any[]) => void;
}

export function BulkUploadDialog({ open, onOpenChange, testId, onUploaded }: BulkUploadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [rawText, setRawText] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const extractTextFromDocx = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTextFromPdf = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      text += strings.join(' ') + '\n';
    }
    return text;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      let extractedText = '';
      if (file.name.endsWith('.docx')) {
        extractedText = await extractTextFromDocx(file);
      } else if (file.name.endsWith('.pdf')) {
        extractedText = await extractTextFromPdf(file);
      } else if (file.name.endsWith('.txt')) {
        extractedText = await file.text();
      } else {
      }
      setRawText(prev => (prev ? prev + '\n\n' + extractedText : extractedText));
      toast.success('Text extracted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to extract text');
    } finally {
      setLoading(false);
    }
    e.target.value = ''; // Reset input
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files));
      toast.success(`${e.target.files.length} images selected`);
    }
  };

  const uploadImagesToStorage = async (files: File[]) => {
    const urls: Record<string, string> = {};
    for (const file of files) {
      const fileName = file.name; // e.g. "1.jpg", "2.jpg"
      const path = `exam-questions/bulk/${Date.now()}_${fileName}`;
      const { error } = await supabase.storage.from('public1').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('public1').getPublicUrl(path);
        urls[fileName.split('.')[0]] = data.publicUrl; // Key by number "1", "2"
      }
    }
    return urls;
  };

  const parseAndSave = async () => {
    if (!rawText.trim()) { toast.error('Please enter or upload some text'); return; }
    setLoading(true);

    try {
      // 1. Upload images if any
      let imageUrls: Record<string, string> = {};
      if (imageFiles.length > 0) {
        imageUrls = await uploadImagesToStorage(imageFiles);
      }

      // 2. Parse text
      // Expected format block:
      // Q1. Question text...?
      // A) Option A
      // B) Option B
      // C) Option C
      // D) Option D
      // Ans: A
      
      const blocks = rawText.split(/(?=Q\d+\.)/i).filter(b => b.trim());
      const parsedQuestions = [];

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        
        let qText = '';
        const options: string[] = [];
        let ansChar = '';

        for (const line of lines) {
          if (line.match(/^Q\d+\./i)) {
            qText = line.replace(/^Q\d+\.\s*/i, '');
          } else if (line.match(/^[A-D]\)/i)) {
            options.push(line.replace(/^[A-D]\)\s*/i, ''));
          } else if (line.match(/^Ans:/i)) {
            ansChar = line.replace(/^Ans:\s*/i, '').trim().toUpperCase();
          } else if (qText && options.length === 0) {
            // Continuation of question text
            qText += ' ' + line;
          }
        }

        if (qText && options.length === 4 && ansChar) {
          const correctIdx = ['A', 'B', 'C', 'D'].indexOf(ansChar);
          const qNumMatch = block.match(/^Q(\d+)\./i);
          const qNum = qNumMatch ? qNumMatch[1] : String(i + 1);

          parsedQuestions.push({
            mock_test_id: testId,
            question_text: qText,
            options,
            correct_option_index: correctIdx >= 0 ? correctIdx : 0,
            marks: 4,
            topic: 'General',
            image_url: imageUrls[qNum] || null, // Map image like "1.jpg" to Q1
          });
        }
      }

      if (parsedQuestions.length === 0) {
        throw new Error('No valid questions found. Please check the formatting.');
      }

      // 3. Save to DB sequentially to avoid rate limits
      const saved = [];
      for (const q of parsedQuestions) {
        const res = await saveMockQuestion(q);
        saved.push(res.question);
      }

      onUploaded(saved);
      onOpenChange(false);
      setRawText('');
      setImageFiles([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to process bulk upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Questions</DialogTitle>
          <DialogDescription>
            Format required: <br/>
            <code>Q1. What is...?</code><br/>
            <code>A) Opt1</code><br/>
            <code>B) Opt2</code><br/>
            <code>C) Opt3</code><br/>
            <code>D) Opt4</code><br/>
            <code>Ans: A</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* File Uploads */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>1. Extract from Document (Optional)</Label>
              <div className="relative">
                <Button variant="outline" className="w-full relative overflow-hidden h-12 border-dashed">
                  <FileText className="w-4 h-4 mr-2" /> Upload .docx or .pdf
                  <input type="file" accept=".docx,.pdf,.txt" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={loading} />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>2. Attach Images (Optional)</Label>
              <div className="relative">
                <Button variant="outline" className="w-full relative overflow-hidden h-12 border-dashed">
                  <UploadCloud className="w-4 h-4 mr-2" /> Upload Images (1.jpg, 2.jpg)
                  <input type="file" accept="image/*" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} disabled={loading} />
                </Button>
              </div>
              {imageFiles.length > 0 && <p className="text-xs text-muted-foreground">{imageFiles.length} images ready</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Raw Text Editor</Label>
            <Textarea 
              value={rawText} 
              onChange={e => setRawText(e.target.value)} 
              placeholder="Paste or edit questions here..." 
              className="min-h-[300px] font-mono text-sm leading-relaxed"
            />
          </div>

          <Button onClick={parseAndSave} className="w-full gradient-primary" disabled={loading || !rawText.trim()}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
            Parse and Save Questions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
