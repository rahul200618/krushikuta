import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Award, ArrowRight } from "lucide-react";
import { courses } from "@/lib/site-data";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Agriculture Courses & ICAR Coaching — Krishikuta" },
      { name: "description", content: "Explore our premium agriculture courses: Agriculture Officer coaching, ICAR JRF/SRF preparation, practical agriculture exam coaching and farm science entrance training." },
      { property: "og:title", content: "Agriculture Courses & ICAR Coaching" },
      { property: "og:description", content: "Carefully designed programs balancing theory, practical training and exam strategy." },
    ],
  }),
  component: Courses,
});

function Courses() {
  return (
    <>
      <PageHero
        eyebrow="Courses"
        title={<>Premium <span className="text-gradient-gold">Coaching Programs</span></>}
        description="Carefully designed courses that balance theory, practical training and exam strategy."
      />
      <section className="section-padding bg-background">
        <div className="container-px mx-auto max-w-7xl grid md:grid-cols-2 gap-6">
          {courses.map((c) => (
            <Card key={c.title} className="overflow-hidden border-border hover:shadow-elegant transition-all">
              <div className={`h-2 ${c.color === "gold" ? "gradient-gold" : "gradient-primary"}`} />
              <div className="p-7">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl font-bold text-foreground">{c.title}</h2>
                  <Award className={`w-7 h-7 ${c.color === "gold" ? "text-gold" : "text-primary"}`} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="px-3 py-1 rounded-full bg-accent text-accent-foreground font-semibold">{c.duration}</span>
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold">{c.mode}</span>
                </div>
                <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {c.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6 gradient-primary text-primary-foreground hover:opacity-90">
                  <Link to="/contact">Enquire Now <ArrowRight className="ml-1 w-4 h-4" /></Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
