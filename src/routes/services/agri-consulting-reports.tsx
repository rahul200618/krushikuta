import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { ArrowRight, CheckCircle2, Banknote, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/services/agri-consulting-reports")({
  head: () => ({
    meta: [
      { title: "Agri Consulting & Project Reports" },
      { name: "description", content: "Bank-ready DPRs for dairy, poultry, crop loans, sheep, and goat farming projects." },
    ],
  }),
  component: ServicePage,
});

function ServicePage() {
  const highlights = [
    "Expert technical guidance",
    "Comprehensive documentation support",
    "Application process assistance",
    "University-specific preparation",
    "Mock tests & evaluation",
    "One-on-one mentorship",
    "Latest notifications & alerts",
    "Success-oriented strategy"
  ];

  const features = [
    { title: "Strategic Planning", desc: "Our experts help you build a roadmap for success in your specific agricultural goal." },
    { title: "Documentation", desc: "Complete support for all paperwork, reports, and application requirements." },
    { title: "Mock Evaluation", desc: "Regular testing and feedback to ensure you are ready for the final step." },
    { title: "Expert Support", desc: "Direct access to mentors who have years of experience in the agriculture sector." },
  ];

  return (
    <>
      <PageHero
        eyebrow="Service"
        title={<>Agri Consulting & Project <span className="text-gradient-gold">Reports</span></>}
        description="Bank-ready DPRs for dairy, poultry, crop loans, sheep, and goat farming projects."
      >
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="gradient-gold text-gold-foreground hover:opacity-90 h-14 px-12 text-lg font-bold shadow-gold transition-all hover:scale-[1.05] rounded-2xl">
            <Link to="/register" search={{ service: "agri-consulting-reports" }}>Register Now <ArrowRight className="ml-2 w-5 h-5" /></Link>
          </Button>
        </div>
      </PageHero>

      <section className="section-padding bg-background">
        <div className="container-px mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Expert Support for <span className="text-gradient-primary">Agri Consulting & Project Reports</span>
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">
                Achieving your goals in the agriculture sector requires specialized knowledge and proper guidance. Our program provides you with the technical expertise and strategic support needed to navigate complex processes and succeed.
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
              {features.map((f) => (
                <Card key={f.title} className="p-6 border-border hover:shadow-elegant transition-all">
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-xl gradient-primary grid place-items-center shrink-0">
                      <Banknote className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{f.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding gradient-cream">
        <div className="container-px mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-foreground">Start Your Journey <span className="text-gradient-primary">Today</span></h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Talk to our experts and get the guidance you need to excel.</p>
          <Button asChild size="lg" className="mt-8 gradient-primary text-primary-foreground hover:opacity-90 h-12 px-7">
            <Link to="/contact"><Phone className="mr-2 w-4 h-4" /> Book Consultation</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
