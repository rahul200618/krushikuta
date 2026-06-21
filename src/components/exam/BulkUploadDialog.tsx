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

  /**
   * Parses ALL "N-X" or "N. X" or "N) X" pairs from a string and returns a map.
   * Handles both comma-separated inline format ("1-B, 2-C, 3-D, ...")
   * and line-by-line format ("1. A\n2. B\n...").
   */
  const extractAnswerPairs = (text: string): Record<string, string> => {
    const map: Record<string, string> = {};
    // Match patterns like: 1-B  1.B  1. B  1) B  1)B  (with optional comma/space separators)
    const re = /\b(\d{1,3})\s*[-\.\)]\s*([A-D])\b/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
      map[m[1]] = m[2].toUpperCase();
    }
    return map;
  };

  /**
   * Detects a trailing answers block at the end of the text.
   * Supports:
   *   Line-by-line:  "1. A\n2. B\n3. C"
   *   Inline:        "1-B, 2-B, 3-C, 4-D, 5-A, ..."  (comma-separated)
   *
   * Returns { answerMap, blockStartIndex } where blockStartIndex is the
   * character index in the original text where the answers section begins.
   * Returns null if no answers block is detected.
   */
  const detectAnswersBlock = (text: string): { map: Record<string, string>; blockStart: number } | null => {
    const lines = text.split('\n');

    // ── Strategy 1: Line-by-line  (e.g. "1. A" or "1) A" or "1-A") ──────────
    const lineAnswerRe = /^Q?(\d+)\s*[-\.\)]\s*([A-D])\s*$/i;
    let answerLineCount = 0;
    let firstAnswerLineIdx = lines.length;
    const lineMap: Record<string, string> = {};

    for (let i = lines.length - 1; i >= 0; i--) {
      const t = lines[i].trim();
      if (t === '') { firstAnswerLineIdx = i; continue; }
      const m = t.match(lineAnswerRe);
      if (m) {
        lineMap[m[1]] = m[2].toUpperCase();
        answerLineCount++;
        firstAnswerLineIdx = i;
      } else {
        if (answerLineCount >= 3) break;
        if (answerLineCount === 0) continue;
        break;
      }
    }

    if (answerLineCount >= 3) {
      const blockStart = lines.slice(0, firstAnswerLineIdx).join('\n').length;
      return { map: lineMap, blockStart };
    }

    // ── Strategy 2: Inline comma-separated (e.g. "1-B, 2-B, 3-C ...") ───────
    // Look at the last few lines for a dense cluster of "N-X" pairs
    const tail = lines.slice(-15).join('\n'); // check last 15 lines
    const inlineMap = extractAnswerPairs(tail);
    const pairCount = Object.keys(inlineMap).length;

    if (pairCount >= 5) {
      // Find where this answers section starts in the full text
      // We look for the first line from the bottom that contains answer pairs
      let firstInlineIdx = lines.length;
      for (let i = lines.length - 1; i >= 0; i--) {
        const pairs = extractAnswerPairs(lines[i]);
        if (Object.keys(pairs).length >= 1) {
          firstInlineIdx = i;
        } else if (lines[i].trim() === '') {
          firstInlineIdx = i; // keep blank separator lines
        } else {
          break;
        }
      }
      const blockStart = lines.slice(0, firstInlineIdx).join('\n').length;
      return { map: inlineMap, blockStart };
    }

    return null;
  };

  /**
   * Strips the trailing answers block from the raw text given the detected blockStart index.
   */
  const stripAnswersBlock = (text: string, blockStart: number): string => {
    return text.slice(0, blockStart).trimEnd();
  };


  const parseAndSave = async () => {
    if (!rawText.trim()) { toast.error('Please enter or upload some text'); return; }
    setLoading(true);

    try {
      let imageUrls: Record<string, string> = {};
      if (imageFiles.length > 0) {
        imageUrls = await uploadImagesToStorage(imageFiles);
      }

      // --- Detect if there's a trailing answers block ---
      const detected = detectAnswersBlock(rawText);
      const trailingAnswers = detected?.map ?? null;
      const questionText = detected
        ? stripAnswersBlock(rawText, detected.blockStart)
        : rawText;

      // Parse text robustly
      const normalizedText = '\n' + questionText.trim();
      // Split by Question markers: Q1., 1., Q2., 2., etc. at the start of a line
      const blocks = normalizedText.split(/\n(?=Q?\d+[\.\)])/i).map(b => b.trim()).filter(b => b);
      const parsedQuestions = [];

      for (let i = 0; i < blocks.length; i++) {
        let block = blocks[i];
        
        // Extract inline Ans: or Answer: (old format)
        let ansChar: string | null = null;
        const ansMatch = block.match(/(?:Ans|Answer)[\s:-]+([A-D])/i);
        if (ansMatch) {
          ansChar = ansMatch[1].toUpperCase();
          block = block.replace(ansMatch[0], ''); // remove from block text
        }

        // Normalize options so they are on newlines.
        // Only split at A) B) C) D) when they appear at start-of-string or after
        // clear whitespace — avoid breaking mid-word brackets like "me)".
        // We look for: (start OR whitespace of 2+) then A-D then ) or .
        block = block.replace(/(^|\s{2,})([A-D][\)\.])/gim, '\n$2');
        block = block.replace(/(^|\s{2,})\(([A-D])\)/gim, '\n($2)');
        
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        
        let qText = '';
        let options: string[] = [];
        let qNumStr = String(i + 1);

        for (const line of lines) {
          const qNumMatch = line.match(/^Q?(\d+)[\.\)]\s*(.*)/i);
          if (qNumMatch && qText === '') {
            qNumStr = qNumMatch[1];
            qText = qNumMatch[2];
          } else if (line.match(/^([A-D])[\.\)]/i) || line.match(/^\(([A-D])\)/i)) {
            // It's an option!
            const optMatch = line.match(/^[\(]?([A-D])[\.\)]?\s*(.*)/i);
            if (optMatch) {
              options.push(optMatch[2]);
            }
          } else if (options.length === 0) {
            // Still building question text
            qText += (qText ? '\n' : '') + line;
          } else {
            // Continuation of the last option
            options[options.length - 1] += ' ' + line;
          }
        }

        if (qText) {
          // Ensure we have exactly 4 options
          while (options.length < 4) options.push(`Option ${String.fromCharCode(65 + options.length)}`);
          options = options.slice(0, 4);

          // Priority: inline Ans: > trailing answers block > default 'A'
          if (!ansChar && trailingAnswers) {
            ansChar = trailingAnswers[qNumStr] || 'A';
          }
          ansChar = ansChar || 'A';

          const correctIdx = ['A', 'B', 'C', 'D'].indexOf(ansChar);

          parsedQuestions.push({
            mock_test_id: testId,
            question_text: qText,
            options,
            correct_option_index: correctIdx >= 0 ? correctIdx : 0,
            marks: 3,
            topic: 'General',
            image_url: imageUrls[qNumStr] || null,
          });
        }
      }

      if (parsedQuestions.length === 0) {
        toast.error('Could not parse any valid questions. Please check the format.');
        setLoading(false);
        return;
      }// 3. Save to DB sequentially to avoid rate limits
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
          <DialogDescription asChild>
            <div className="text-xs space-y-3 text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground mb-1">📌 Format 1 — Answers inline (per question):</p>
                <code className="block bg-muted rounded p-2 whitespace-pre leading-5">{`Q1. What is...?
A) Opt1
B) Opt2
C) Opt3
D) Opt4
Ans: A

Q2. Another question?
A) ...
...
Ans: C`}</code>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">📌 Format 2 — All questions first, answers at the end:</p>
                <code className="block bg-muted rounded p-2 whitespace-pre leading-5">{`Q1. What is...?
A) Opt1  B) Opt2  C) Opt3  D) Opt4

Q2. Another question?
A) ...  B) ...  C) ...  D) ...

(all questions up to Q100...)

Answers can be line-by-line:
1. A
2. C
3. B

Or inline/comma-separated:
1-A, 2-C, 3-B, 4-D, 5-A...`}</code>
              </div>
              <p className="text-xs">Both formats are detected automatically.</p>
            </div>
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
