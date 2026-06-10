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
import { Trophy, CheckCircle2, XCircle, Printer, ArrowLeft, TrendingUp } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: sub } = await supabase
          .from('exam_submissions')
          .select('*')
          .eq('id', submissionId)
          .single();

        if (!sub) return;
        setSubmission(sub);

        const qRes = await getMockQuestions(sub.test_id);
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
        <Link to="/exam" className="mt-4 inline-block">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const answers = submission.answers || {};
  const maxScore = questions.reduce((sum, q) => sum + (q.marks || 4), 0);
  const correctCount = questions.filter(q => {
    const selected = answers[q.id];
    return selected !== undefined && Number(selected) === q.correct_option_index;
  }).length;
  const wrongCount = questions.filter(q => answers[q.id] !== undefined && Number(answers[q.id]) !== q.correct_option_index).length;
  const skippedCount = questions.filter(q => answers[q.id] === undefined).length;
  const pct = maxScore > 0 ? Math.round((submission.score / maxScore) * 100) : 0;

  // Topic-wise analysis
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
        <p className="text-sm text-gray-500">Submission #{submissionId} • {new Date(submission.submitted_at).toLocaleString()}</p>
      </div>

      {/* Score hero */}
      <Card className="p-8 text-center space-y-4 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent print:border-gray-200">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-primary/30 bg-primary/10 print:border-gray-300">
            <Trophy className="w-10 h-10" style={{ color: scoreColor }} />
          </div>
        </div>
        <div>
          <p className="text-5xl font-extrabold" style={{ color: scoreColor }}>{submission.score}</p>
          <p className="text-muted-foreground text-sm mt-1">out of {maxScore} marks ({pct}%)</p>
        </div>

        <div className="flex justify-center gap-6 pt-4 flex-wrap">
          {[
            { label: 'Correct', value: correctCount, icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Wrong', value: wrongCount, icon: XCircle, color: 'text-red-500' },
            { label: 'Skipped', value: skippedCount, icon: TrendingUp, color: 'text-amber-500' },
            { label: 'Total', value: questions.length, icon: Trophy, color: 'text-primary' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <Icon className={`w-5 h-5 ${color}`} />
              <span className={`text-xl font-bold ${color}`}>{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <div className="max-w-sm mx-auto">
          <Progress value={pct} className="h-3 rounded-full" />
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3 pt-2 print:hidden">
          <Link to="/exam"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Button></Link>
          <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Print / Save PDF</Button>
        </div>
      </Card>

      {/* Topic-wise breakdown */}
      {topicData.length > 0 && (
        <Card className="p-6 print:border-gray-200">
          <h2 className="font-bold text-lg mb-4">Topic-Wise Performance</h2>
          <ResponsiveContainer width="100%" height={200} className="print:hidden">
            <BarChart data={topicData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Score']} />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                {topicData.map((entry, i) => (
                  <Cell key={i} fill={entry.pct >= 60 ? '#16a34a' : entry.pct >= 40 ? '#d97706' : '#dc2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Table for print */}
          <div className="mt-4 space-y-2">
            {topicData.map(t => (
              <div key={t.name} className="flex items-center gap-3">
                <span className="text-sm font-medium w-36 shrink-0 truncate">{t.name}</span>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${t.pct}%`, backgroundColor: t.pct >= 60 ? '#16a34a' : t.pct >= 40 ? '#d97706' : '#dc2626' }} />
                </div>
                <span className="text-sm font-bold w-14 text-right">{t.correct}/{t.total}</span>
                <span className="text-xs text-muted-foreground w-10 text-right">{t.pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}

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
                      <span>Marks: <strong>{q.marks}</strong></span>
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
