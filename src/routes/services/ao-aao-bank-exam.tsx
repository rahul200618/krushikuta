import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { ArrowRight, CheckCircle2, GraduationCap, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/services/ao-aao-bank-exam")({
  head: () => ({
    meta: [
      { title: "AO/AAO & Bank Exam Prep Guide — Krishikuta" },
      { name: "description", content: "Comprehensive preparation guide for Agriculture Officer, AAO, and banking exams." },
    ],
  }),
  component: ServicePage,
});

function ServicePage() {
  const highlights = [
    "Full syllabus coverage for AO/AAO",
    "Banking-specific agriculture modules",
    "Daily mock tests and assessments",
    "Previous year question analysis",
    "Interview preparation sessions",
    "Dedicated study materials & PDFs",
    "Live doubt-clearing sessions",
    "Weekly current affairs updates"
  ];

  return (
    <>
      <PageHero
        eyebrow="Career Excellence"
        title={<>AO / AAO & <span className="text-gradient-gold">Bank Exam Prep</span></>}
        description="Your definitive guide and coaching for securing top government and banking positions in agriculture."
      >
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="gradient-gold text-gold-foreground hover:opacity-90 h-14 px-12 text-lg font-bold shadow-gold transition-all hover:scale-[1.05] rounded-2xl">
            <Link to="/register" search={{ service: "ao-aao-bank-exam" }}>Register Now <ArrowRight className="ml-2 w-5 h-5" /></Link>
          </Button>
        </div>
      </PageHero>

      <section className="section-padding bg-background">
        <div className="container-px mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Build a <span className="text-gradient-primary">Stable Career</span>
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">
                Agriculture Officer and Banking roles offer some of the most prestigious career paths in the industry. Our structured approach ensures you master both the technical agriculture concepts and the aptitude required for these competitive exams.
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
                  <GraduationCap className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">Professional Mentorship</h3>
                <p className="text-sm text-muted-foreground mb-6">Get mentored by professionals who have successfully cleared these exams themselves.</p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/contact">Enquire Now</Link>
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding gradient-cream">
        <div className="container-px mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-foreground">Achieve Your <span className="text-gradient-primary">Dream Job</span></h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Start your preparation journey with India's most trusted agriculture institute.</p>
          <Button asChild size="lg" className="mt-8 gradient-primary text-primary-foreground hover:opacity-90 h-12 px-7">
            <Link to="/contact"><Phone className="mr-2 w-4 h-4" /> Start Preparation</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
