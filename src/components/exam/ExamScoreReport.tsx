import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { getMockQuestions } from '@/lib/exam-api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Trophy, CheckCircle2, XCircle, Printer, ArrowLeft, TrendingUp, Clock, BookOpen, FileText } from 'lucide-react';

function formatDuration(seconds: number): string {
  if (!seconds) return 'N/A';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

interface Question {
  id: number; question_text: string; options: string[];
  correct_option_index: number; image_url?: string; marks: number; topic: string;
}

interface Submission {
  id: number; user_id: string; test_id: number; name: string; phone: string;
  email: string; college: string; score: number; total_questions: number;
  answers: Record<string, number>; is_completed: boolean; submitted_at: string;
}

interface ExamScoreReportProps {
  submissionId: number;
}

export function ExamScoreReport({ submissionId }: ExamScoreReportProps) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mockTest, setMockTest] = useState<{ title: string; category: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: sub } = await supabase
          .from('exam_submissions')
          .select('*, mock_tests(title, category)')
          .eq('id', submissionId)
          .single();

        if (!sub) return;
        // Extract joined test info then strip it from the submission object
        const { mock_tests: testInfo, ...subData } = sub as any;
        setSubmission(subData);
        if (testInfo) setMockTest(testInfo);

        const qRes = await getMockQuestions(subData.test_id);
        setQuestions(qRes.questions || []);
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    };
    load();
  }, [submissionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Report not found.</p>
        <Link to="/ao/aao" className="mt-4 inline-block">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const answers = submission.answers || {};
  // Filter out meta keys like _time_taken for calculating skipped count
  const correctCount = questions.filter(q => {
    const selected = answers[q.id];
    return selected !== undefined && Number(selected) === q.correct_option_index;
  }).length;
  const wrongCount = questions.filter(q => answers[q.id] !== undefined && Number(answers[q.id]) !== q.correct_option_index).length;
  const skippedCount = questions.filter(q => answers[q.id] === undefined).length;

  const isScaled = answers._time_taken !== undefined;
  const score = isScaled ? submission.score / 100 : submission.score;
  const maxScore = isScaled ? questions.length * 3 : questions.reduce((sum, q) => sum + (q.marks === 4 || !q.marks ? 3 : q.marks), 0);
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const topicMap: Record<string, { correct: number; total: number }> = {};
  questions.forEach(q => {
    const topic = q.topic || 'General';
    if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
    topicMap[topic].total++;
    if (answers[q.id] !== undefined && Number(answers[q.id]) === q.correct_option_index) {
      topicMap[topic].correct++;
    }
  });
  const topicData = Object.entries(topicMap).map(([name, { correct, total }]) => ({
    name, correct, total, pct: Math.round((correct / total) * 100),
  }));

  const scoreColor = pct >= 60 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626';

  return (
    <div className="space-y-8">
      {/* Print-only header */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-2xl font-bold">Krishikuta — Exam Score Report</h1>
        {mockTest && (
          <p className="text-base font-semibold text-gray-700 mt-1">{mockTest.title}</p>
        )}
        {mockTest?.category && (
          <p className="text-sm text-gray-500">Subject / Paper: {mockTest.category}</p>
        )}
        <p className="text-sm text-gray-400 mt-1">Submission #{submissionId} • {new Date(submission.submitted_at).toLocaleString()}</p>
      </div>

      {/* Paper / Subject banner — visible on screen */}
      {mockTest && (
        <div className="rounded-xl border border-border bg-gradient-to-r from-primary/5 via-background to-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 print:hidden">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paper</p>
              <p className="font-semibold text-foreground truncate">{mockTest.title}</p>
            </div>
          </div>
          {mockTest.category && (
            <>
              <div className="hidden sm:block w-px h-8 bg-border" />
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject</p>
                  <p className="font-semibold text-foreground">{mockTest.category}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Total Scored */}
        <Card className="p-6 border-l-4 border-l-emerald-500 shadow-sm flex flex-col justify-between h-36 bg-white print:border-gray-200">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-slate-500">Total Scored</span>
            <Trophy className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-emerald-600">
              {score % 1 === 0 ? score.toString() : score.toFixed(2)}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              out of {maxScore} marks ({pct}%)
            </p>
          </div>
        </Card>

        {/* Card 2: Total Negatived */}
        <Card className="p-6 border-l-4 border-l-rose-500 shadow-sm flex flex-col justify-between h-36 bg-white print:border-gray-200">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-slate-500">Total Negatived</span>
            <XCircle className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-rose-600">
              {isScaled ? `-${(wrongCount * 0.75).toFixed(2)}` : '0'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              from {wrongCount} incorrect answers
            </p>
          </div>
        </Card>

        {/* Card 3: Time Taken */}
        <Card className="p-6 border-l-4 border-l-blue-500 shadow-sm flex flex-col justify-between h-36 bg-white print:border-gray-200">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-slate-500">Time Taken</span>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-blue-600">
              {formatDuration(answers._time_taken as number)}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              for the entire paper
            </p>
          </div>
        </Card>

        {/* Card 4: Correct Answers */}
        <Card className="p-6 border-l-4 border-l-green-500 shadow-sm flex flex-col justify-between h-36 bg-white print:border-gray-200">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-slate-500">Correct Answers</span>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-green-600">
              {correctCount}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              out of {questions.length} questions
            </p>
          </div>
        </Card>

        {/* Card 5: Wrong Answers */}
        <Card className="p-6 border-l-4 border-l-red-500 shadow-sm flex flex-col justify-between h-36 bg-white print:border-gray-200">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-slate-500">Wrong Answers</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-red-600">
              {wrongCount}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              out of {questions.length} questions
            </p>
          </div>
        </Card>

        {/* Card 6: Skipped Questions */}
        <Card className="p-6 border-l-4 border-l-amber-500 shadow-sm flex flex-col justify-between h-36 bg-white print:border-gray-200">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-slate-500">Skipped Questions</span>
            <TrendingUp className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-amber-600">
              {skippedCount}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              out of {questions.length} questions
            </p>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3 pt-4 print:hidden">
        <Link to="/ao/aao"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Button></Link>
        <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Print / Save PDF</Button>
      </div>

      {/* Detailed answer key */}
      <Card className="p-0 overflow-hidden print:border-gray-200">
        <div className="p-5 border-b bg-muted/20">
          <h2 className="font-bold text-lg">Detailed Answer Analysis</h2>
        </div>
        <div className="divide-y divide-border">
          {questions.map((q, idx) => {
            const selected = answers[q.id];
            const isCorrect = selected !== undefined && Number(selected) === q.correct_option_index;
            const isWrong = selected !== undefined && !isCorrect;
            const isSkipped = selected === undefined;

            return (
              <div key={q.id} className={`p-5 transition-colors ${isCorrect ? 'bg-green-50/50 dark:bg-green-950/20' : isWrong ? 'bg-red-50/50 dark:bg-red-950/20' : 'bg-muted/10'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCorrect ? 'bg-green-100 text-green-700' : isWrong ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}>
                    {isCorrect ? '✓' : isWrong ? '✗' : '–'}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="font-medium text-sm">Q{idx + 1}. {q.question_text}</p>
                    {q.image_url && (
                      <img src={q.image_url} alt="" className="rounded-lg max-h-40 object-contain border border-border" />
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-2
                            ${i === q.correct_option_index ? 'border-green-400 bg-green-50 text-green-800 font-semibold dark:bg-green-950/40 dark:text-green-400' : ''}
                            ${Number(selected) === i && i !== q.correct_option_index ? 'border-red-400 bg-red-50 text-red-800 line-through dark:bg-red-950/40 dark:text-red-400' : ''}
                            ${i !== q.correct_option_index && Number(selected) !== i ? 'border-transparent bg-muted/40 text-muted-foreground' : ''}`}
                        >
                          <span className="font-bold">{String.fromCharCode(65 + i)}.</span> {opt}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                      <span>Correct: <strong className="text-green-700">{String.fromCharCode(65 + q.correct_option_index)}</strong></span>
                      {!isSkipped && <span>Your answer: <strong className={isCorrect ? 'text-green-700' : 'text-red-600'}>{String.fromCharCode(65 + Number(selected))}</strong></span>}
                      {isSkipped && <span className="text-amber-600">Skipped</span>}
                      <span>Marks: <strong>{q.marks === 4 || !q.marks ? 3 : q.marks}</strong></span>
                      <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary">{q.topic}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Print styles are injected via a global style tag */}
      <style>{`
        @media print {
          nav, footer, button, .print\\:hidden { display: none !important; }
          body { font-size: 12px; }
          .print\\:border-gray-200 { border: 1px solid #e5e7eb; }
        }
      `}</style>
    </div>
  );
}
