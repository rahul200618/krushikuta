import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { getMockQuestions, startTest, submitTest } from '@/lib/exam-api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Maximize2, Clock, ChevronLeft, ChevronRight, Send, SkipForward } from 'lucide-react';

interface Question {
  id: number; question_text: string; options: string[];
  correct_option_index: number; image_url?: string; marks: number; topic: string;
}

interface ExamTestInterfaceProps {
  testId: number; userId: string; userProfile: Record<string, unknown> | null;
  durationMinutes?: number;
}

function getStorageKey(userId: string, testId: number) {
  return `exam_autosave_${userId}_${testId}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

type QuestionState = 'unvisited' | 'visited' | 'answered' | 'current';

export function ExamTestInterface({ testId, userId, userProfile, durationMinutes = 50 }: ExamTestInterfaceProps) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [visitedSet, setVisitedSet] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSubmitted = useRef(false);

  // Load from localStorage or start fresh
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [qRes, startRes] = await Promise.all([
          getMockQuestions(testId),
          startTest({
            userId, testId,
            name: (userProfile?.name as string) || '',
            phone: (userProfile?.mobile as string) || '',
            email: (userProfile?.email as string) || '',
            college: (userProfile?.college as string) || '',
          }),
        ]);

        const qs: Question[] = qRes.questions || [];
        setQuestions(qs);

        const savedRaw = localStorage.getItem(getStorageKey(userId, testId));
        if (savedRaw) {
          try {
            const saved = JSON.parse(savedRaw);
            setAnswers(saved.answers || {});
            setTimeLeft(saved.timeLeft ?? durationMinutes * 60);
            setSubmissionId(saved.submissionId ?? startRes.submissionId);
            setVisitedSet(new Set(Object.keys(saved.answers || {}).map(Number)));
            return;
          } catch { /* fresh start */ }
        }
        setSubmissionId(startRes.submissionId);
        setTimeLeft(durationMinutes * 60);
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    };
    init();
  }, [testId, userId]);

  // Timer countdown
  useEffect(() => {
    if (loading || submitting) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [loading, submitting]);

  // Autosave
  useEffect(() => {
    if (!submissionId || loading) return;
    const key = getStorageKey(userId, testId);
    localStorage.setItem(key, JSON.stringify({ answers, timeLeft, submissionId }));
  }, [answers, timeLeft, submissionId]);

  const handleAutoSubmit = useCallback(async () => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;
    await doSubmit();
  }, [answers, submissionId, testId]);

  const doSubmit = async () => {
    if (!submissionId) return;
    setSubmitting(true);
    try {
      localStorage.removeItem(getStorageKey(userId, testId));
      await submitTest(submissionId, testId, answers);
      navigate({ to: `/exam-report/${submissionId}` as any });
    } catch { setSubmitting(false); }
  };

  const handleAnswerSelect = (optionIdx: number) => {
    const qId = questions[currentIdx].id;
    setAnswers(prev => ({ ...prev, [qId]: optionIdx }));
    setVisitedSet(prev => new Set(prev).add(currentIdx));
  };

  const handleNext = () => {
    setVisitedSet(prev => new Set(prev).add(currentIdx));
    setCurrentIdx(prev => Math.min(prev + 1, questions.length - 1));
  };

  const handlePrev = () => setCurrentIdx(prev => Math.max(prev - 1, 0));

  const handleSkip = () => {
    setVisitedSet(prev => new Set(prev).add(currentIdx));
    setCurrentIdx(prev => Math.min(prev + 1, questions.length - 1));
  };

  const handleJump = (idx: number) => {
    setVisitedSet(prev => new Set(prev).add(currentIdx));
    setCurrentIdx(idx);
  };

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().then(() => {
      setIsFullscreen(true);
      setShowFullscreenPrompt(false);
    }).catch(() => setShowFullscreenPrompt(false));
  };

  const getQuestionState = (idx: number): QuestionState => {
    if (idx === currentIdx) return 'current';
    const qId = questions[idx]?.id;
    if (answers[qId] !== undefined) return 'answered';
    if (visitedSet.has(idx)) return 'visited';
    return 'unvisited';
  };

  const stateColors: Record<QuestionState, string> = {
    current: 'bg-blue-500 text-white border-blue-500',
    answered: 'bg-green-500 text-white border-green-500',
    visited: 'bg-amber-400 text-white border-amber-400',
    unvisited: 'bg-muted text-muted-foreground border-border',
  };

  const answered = Object.keys(answers).length;
  const progress = questions.length ? (answered / questions.length) * 100 : 0;
  const currentQ = questions[currentIdx];
  const timerDanger = timeLeft < 300;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground font-medium">Loading exam...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Fullscreen prompt overlay */}
      {showFullscreenPrompt && !isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <Maximize2 className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Enter Fullscreen</h2>
            <p className="text-muted-foreground text-sm">For the best exam experience and to minimize distractions, please enter fullscreen mode.</p>
            <div className="flex gap-3">
              <Button className="flex-1 gradient-primary" onClick={enterFullscreen}>
                <Maximize2 className="w-4 h-4 mr-2" /> Enter Fullscreen
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowFullscreenPrompt(false)}>
                Continue Without
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-slate-100 border-b border-border shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs text-muted-foreground">Question</p>
              <p className="font-bold text-sm">{currentIdx + 1} / {questions.length}</p>
            </div>
          </div>

          <div className="flex-1 max-w-xs">
            <Progress value={progress} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-0.5 text-center">{answered} answered</p>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono font-bold text-sm ${timerDanger ? 'bg-red-50 border-red-300 text-red-600 animate-pulse' : 'bg-muted border-border'}`}>
            <Clock className="w-3.5 h-3.5" />
            {formatTime(timeLeft)}
          </div>

          <Button size="sm" className="gradient-primary shrink-0" onClick={() => setConfirmSubmit(true)} disabled={submitting}>
            <Send className="w-3.5 h-3.5 mr-1.5" />
            <span className="hidden sm:inline">Submit</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Question area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {currentQ && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Question meta */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{currentQ.topic}</span>
                <span>•</span>
                <span>{currentQ.marks} marks</span>
              </div>

              {/* Question card */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <p className="font-medium text-base leading-relaxed mb-4 whitespace-pre-wrap">{currentQ.question_text}</p>
                {currentQ.image_url && (
                  <img src={currentQ.image_url} alt="Question" className="rounded-xl max-h-64 object-contain mb-4 border border-border" />
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((opt, i) => {
                  const selected = answers[currentQ.id] === i;
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswerSelect(i)}
                      className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all text-sm font-medium hover:shadow-soft
                        ${selected ? 'bg-primary text-primary-foreground border-primary shadow-soft' : 'bg-card border-border hover:border-primary/50 hover:bg-primary/5'}`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${selected ? 'bg-primary-foreground text-primary border-primary-foreground' : 'border-border bg-muted'}`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="pt-0.5">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={handlePrev} disabled={currentIdx === 0}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <Button variant="ghost" onClick={handleSkip} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                  <SkipForward className="w-4 h-4 mr-1" /> Skip
                </Button>
                {currentIdx === questions.length - 1 ? (
                  <Button className="gradient-primary" onClick={() => setConfirmSubmit(true)} disabled={submitting}>
                    Submit <Send className="w-4 h-4 ml-1.5" />
                  </Button>
                ) : (
                  <Button className="gradient-primary" onClick={handleNext}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Question Sidebar */}
        <aside className="w-20 md:w-56 border-l border-border bg-card overflow-y-auto shrink-0 p-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 hidden md:block">Questions</p>
          
          {/* Legend */}
          <div className="hidden md:flex flex-col gap-1.5 mb-4 text-[10px] text-muted-foreground">
            {(['current', 'answered', 'visited', 'unvisited'] as QuestionState[]).map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded border text-[8px] flex items-center justify-center ${stateColors[s]}`}>Q</div>
                <span className="capitalize">{s}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            {questions.map((_, idx) => {
              const state = getQuestionState(idx);
              return (
                <button
                  key={idx}
                  onClick={() => handleJump(idx)}
                  className={`w-full aspect-square rounded-lg border text-xs font-bold flex items-center justify-center transition-all hover:scale-105 ${stateColors[state]}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Submit confirmation dialog */}
      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answered} out of {questions.length} questions.
              {questions.length - answered > 0 && ` ${questions.length - answered} questions are unanswered.`}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction
              onClick={doSubmit}
              className="gradient-primary"
            >
              <Send className="w-4 h-4 mr-2" /> Submit Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
