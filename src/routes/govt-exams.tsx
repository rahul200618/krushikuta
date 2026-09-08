import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Trophy, 
  Clock, 
  BrainCircuit, 
  BarChart3, 
  Zap, 
  Send, 
  PhoneCall, 
  Flame, 
  Award,
  ChevronRight,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExamAuthModal } from "@/components/exam/ExamAuthModal";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/govt-exams")({
  head: () => ({
    meta: [
      { title: "Govt Agriculture Exams Online Mock Tests — Krishikuta" },
      { 
        name: "description", 
        content: "Practice real exam-pattern online mock tests for AO, AAO, AHO, ADH, and other government agriculture & allied exams with full CBT simulation and in-depth performance analytics." 
      },
    ],
  }),
  component: GovtExamsPage,
});

export function GovtExamsPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [targetExamPath, setTargetExamPath] = useState<string>("/exam-dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleExamClick = (path: string) => {
    if (session) {
      navigate({ to: path as any });
    } else {
      setTargetExamPath(path);
      setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    navigate({ to: targetExamPath as any });
  };

  return (
    <div className="min-h-screen bg-[#07130a] text-slate-100 overflow-hidden selection:bg-emerald-500 selection:text-black">
      
      {/* 3D Ambient Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-emerald-600/15 blur-[120px] animate-pulse" />
        <div className="absolute top-[30%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-green-500/10 blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-teal-600/10 blur-[150px]" />
        
        {/* Perspective Grid Line */}
        <div 
          className="absolute inset-0 opacity-[0.12]" 
          style={{
            backgroundImage: `linear-gradient(to right, #10b981 1px, transparent 1px), linear-gradient(to bottom, #10b981 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 100%)",
            transform: "perspective(1000px) rotateX(25deg)",
            transformOrigin: "top center"
          }}
        />
      </div>

      <div className="relative z-10 pt-4 md:pt-6 pb-20">
        
        {/* HERO SECTION */}
        <div className="container-px mx-auto max-w-7xl">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-8 md:mb-12">
            
            {/* 3D Floating Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 via-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide uppercase shadow-[0_0_15px_rgba(16,185,129,0.2)] backdrop-blur-md mb-3">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Real Exam-Pattern Online Mock Test Engine</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight font-display text-white leading-tight">
              Master Govt <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-teal-200 bg-clip-text text-transparent">Agriculture Exams</span> with Real CBT Mock Tests
            </h1>

            {/* Subtitle */}
            <p className="mt-2.5 text-xs sm:text-sm md:text-base text-slate-300/90 max-w-2xl leading-relaxed">
              Experience authentic Computer Based Test (CBT) simulations designed strictly according to the latest official government exam syllabi, negative marking schemes, and state-level benchmarking.
            </p>

            {/* HIGH-CONVERTING COMPACT WHITE EXAM SELECTOR CARDS (AO/AAO & AHO/ADH) */}
            <div className="mt-5 sm:mt-6 w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 text-left">
              
              {/* BUTTON CARD 1: AO / AAO */}
              <div
                onClick={() => handleExamClick("/exam-dashboard")}
                className="group relative block p-5 rounded-2xl bg-white hover:bg-slate-50 border border-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:shadow-[0_15px_35px_rgba(16,185,129,0.3)] transition-all duration-200 hover:-translate-y-1 active:scale-[0.99] cursor-pointer overflow-hidden"
              >
                <div className="flex items-center gap-3.5 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
                    AO
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors font-display truncate">
                      AO / AAO Preparation
                    </h3>
                    <p className="text-[11px] sm:text-xs text-emerald-700 font-semibold truncate">
                      Agriculture Officer & Asst. Officer
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                  Full-length mock tests strictly on KPSC / State Agriculture Officer pattern with instant score & state rank.
                </p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-800 tracking-wide uppercase">
                    Start AO / AAO Mocks
                  </span>
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:bg-emerald-500 group-hover:translate-x-0.5 transition-all shadow-sm">
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                </div>
              </div>

              {/* BUTTON CARD 2: AHO / ADH */}
              <div
                onClick={() => handleExamClick("/exam-dashboard")}
                className="group relative block p-5 rounded-2xl bg-white hover:bg-slate-50 border border-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:shadow-[0_15px_35px_rgba(34,197,94,0.3)] transition-all duration-200 hover:-translate-y-1 active:scale-[0.99] cursor-pointer overflow-hidden"
              >
                <div className="flex items-center gap-3.5 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-green-600 to-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
                    AHO
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors font-display truncate">
                      AHO / ADH Preparation
                    </h3>
                    <p className="text-[11px] sm:text-xs text-emerald-700 font-semibold truncate">
                      Asst. Horticultural Officer & ADH
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                  Specialized mock exams for Pomology, Olericulture, Floriculture & complete Horticulture syllabus.
                </p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-800 tracking-wide uppercase">
                    Explore AHO / ADH Series
                  </span>
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:bg-emerald-500 group-hover:translate-x-0.5 transition-all shadow-sm">
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl pt-8 border-t border-white/10">
              <div className="p-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">100%</div>
                <div className="text-xs text-slate-400 mt-0.5">Exam-Exact Pattern</div>
              </div>
              <div className="p-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">Instant</div>
                <div className="text-xs text-slate-400 mt-0.5">Score & Detailed Solutions</div>
              </div>
              <div className="p-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">Live</div>
                <div className="text-xs text-slate-400 mt-0.5">State-Level Ranking</div>
              </div>
              <div className="p-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">Timed</div>
                <div className="text-xs text-slate-400 mt-0.5">CBT Interface Simulation</div>
              </div>
            </div>

          </div>

          {/* 3D SIMULATED EXAM INTERFACE SHOWCASE (Interactive Animated Mockup) */}
          <div className="relative max-w-5xl mx-auto my-12 md:my-20">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur-xl opacity-30 animate-pulse" />
            
            <div 
              className="relative bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-4 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl"
              style={{
                transform: "perspective(1200px) rotateX(4deg)",
                transition: "transform 0.5s ease"
              }}
            >
              {/* Fake Window Header */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="ml-2 font-mono text-slate-300 font-medium">Krishikuta CBT Engine v2.4</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} /> Time Remaining: 01:45:20
                  </span>
                </div>
              </div>

              {/* Mock Test Screen Inside */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Question Area */}
                <div className="lg:col-span-2 bg-[#0c1a11] rounded-2xl p-5 sm:p-6 border border-emerald-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30">
                        Section: Agricultural Economics & Extension
                      </Badge>
                      <span className="text-xs text-slate-400 font-mono">Q. 42 / 100</span>
                    </div>

                    <h4 className="text-base sm:text-lg font-semibold text-white leading-relaxed mb-6">
                      Which of the following agricultural price policy mechanisms in India is recommended by the Commission for Agricultural Costs and Prices (CACP) before the sowing season?
                    </h4>

                    <div className="space-y-3">
                      {[
                        "A) Minimum Support Price (MSP)",
                        "B) Fair and Remunerative Price (FRP)",
                        "C) Procurement Price",
                        "D) Market Intervention Price (MIP)"
                      ].map((opt, i) => (
                        <div 
                          key={i} 
                          className={`p-3.5 rounded-xl border text-sm font-medium flex items-center gap-3 transition-all ${
                            i === 0 
                              ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                              : "bg-white/5 border-white/10 text-slate-300 hover:border-white/20"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? "bg-emerald-400 text-black" : "bg-white/10 text-slate-400"
                          }`}>
                            {i === 0 ? <Check className="w-3 h-3 stroke-[3]" /> : String.fromCharCode(65 + i)}
                          </div>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/10 text-xs">
                    <button className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300">Previous</button>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">Mark for Review</button>
                      <button className="px-4 py-1.5 rounded-lg bg-emerald-500 text-black font-bold hover:bg-emerald-400">Save & Next</button>
                    </div>
                  </div>
                </div>

                {/* Right Side Palette & Stats */}
                <div className="space-y-4">
                  <div className="bg-[#0c1a11] rounded-2xl p-5 border border-emerald-500/20">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Live Question Palette</div>
                    <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono">
                      {[...Array(20)].map((_, idx) => {
                        const num = idx + 1;
                        let statusClass = "bg-white/5 text-slate-400 border-white/10";
                        if (num <= 12) statusClass = "bg-emerald-500/30 text-emerald-300 border-emerald-500/50 font-bold";
                        else if (num === 13) statusClass = "bg-amber-500/30 text-amber-300 border-amber-500/50";
                        else if (num === 14) statusClass = "bg-red-500/30 text-red-300 border-red-500/50";
                        return (
                          <div key={num} className={`p-2 rounded-lg border ${statusClass}`}>
                            {num}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 rounded-2xl p-5 border border-emerald-500/30">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
                      <Award className="w-4 h-4" /> AI Performance Radar
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Simulates negative marking (-0.25), sectional speed metrics, accuracy distribution, and percentile estimation against top aspirants.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* WHY CHOOSE KRISHIKUTA ONLINE CBT MOCKS */}
        <div className="container-px mx-auto max-w-7xl mt-20 md:mt-28">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display">
              Why Practice on Krishikuta's CBT Platform?
            </h2>
            <p className="mt-3 text-slate-300 text-base">
              Engineered specifically for Agriculture & Allied sector competitive examinations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/40 transition-all backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Real Exam CBT Replica</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Experience the identical question palette, countdown timer, review flags, and navigation layout used in official recruitment exams.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/40 transition-all backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Granular Subject Analytics</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Instantly identify your strongest and weakest topics with accuracy percentages, negative mark deductions, and time spent per question.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/40 transition-all backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Live Rank & Percentile</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Benchmark your scores against thousands of actual aspirants across the state to gauge real competition before the final exam.
              </p>
            </div>

          </div>
        </div>

        {/* CTA FOOTER BANNER */}
        <div className="container-px mx-auto max-w-5xl mt-20">
          <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-emerald-900/70 via-slate-900 to-[#07130a] border border-emerald-500/30 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 font-display">
              Have Questions or Need Customized Test Access?
            </h3>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8">
              Connect with our academic counselors directly for mock series enrollments, paper explanations, and expert mentoring.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <a 
                href="https://wa.me/919108652322?text=Hello%20Krishikuta%2C%20I%20want%20information%20about%20Govt%20Exams%20Mock%20Tests%20(AO%2FAAO%2FAHO%2FADH)" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
                Chat on WhatsApp
              </a>
              <a 
                href="tel:+919108652322" 
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20 transition-all"
              >
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                Call +91 9108652322
              </a>
            </div>
          </div>
        </div>

      </div>

      <ExamAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={handleAuthSuccess}
      />

    </div>
  );
}
