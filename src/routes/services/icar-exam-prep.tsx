import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { ArrowRight, CheckCircle2, BookOpen, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/services/icar-exam-prep")({
  head: () => ({
    meta: [
      { title: "ICAR Exam Prep Guide — Krishikuta" },
      { name: "description", content: "Complete preparation strategy and materials for ICAR entrance exams." },
    ],
  }),
  component: ServicePage,
});

function ServicePage() {
  const highlights = [
    "JRF / SRF specialized coaching",
    "Subject-wise expert mentors",
    "Comprehensive concept videos",
    "Unlimited MCQ practice sets",
    "Weekly rank-based mock exams",
    "Printed study material delivery",
    "Strategy sessions with top rankers",
    "Application form filling support"
  ];

  return (
    <>
      <PageHero
        eyebrow="National Level Coaching"
        title={<>ICAR Exam <span className="text-gradient-gold">Prep Guide</span></>}
        description="Master the ICAR JRF/SRF and PG entrance exams with our proven methodology and expert faculty."
      >
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="gradient-gold text-gold-foreground hover:opacity-90 h-14 px-12 text-lg font-bold shadow-gold transition-all hover:scale-[1.05] rounded-2xl">
            <Link to="/register" search={{ service: "icar-exam-prep" }}>Register Now <ArrowRight className="ml-2 w-5 h-5" /></Link>
          </Button>
        </div>
      </PageHero>

      <section className="section-padding bg-background">
        <div className="container-px mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Crack ICAR with <span className="text-gradient-primary">Top Ranks</span>
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">
                The ICAR exams are the gateway to the best agricultural universities in India. Our program is specifically designed to cover the vast syllabus with a focus on high-yield topics and time management skills.
              </p>
              <ul className="mt-7 grid sm:grid-cols-2 gap-3">
                {highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm text-foreground/85">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> {h}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4">
              <Card className="p-8 border-primary/20 bg-primary/5 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl gradient-primary grid place-items-center mb-6">
                  <BookOpen className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">Academic Excellence</h3>
                <p className="text-sm text-muted-foreground mb-6">Join thousands of students who have secured admissions in top ICAR institutions.</p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/contact">Download Prospectus</Link>
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding gradient-cream">
        <div className="container-px mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-foreground">Future-Proof Your <span className="text-gradient-primary">Education</span></h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Talk to our counselors about the best ICAR preparation strategy for you.</p>
          <Button asChild size="lg" className="mt-8 gradient-primary text-primary-foreground hover:opacity-90 h-12 px-7">
            <Link to="/contact"><Phone className="mr-2 w-4 h-4" /> Enquire Now</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
