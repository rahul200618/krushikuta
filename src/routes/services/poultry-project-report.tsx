import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { ArrowRight, CheckCircle2, Egg, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/services/poultry-project-report")({
  head: () => ({
    meta: [
      { title: "Poultry Farming Project Reports — Krishikuta" },
      { name: "description", content: "Professional guidance and bankable project reports for poultry farming project reports." },
    ],
  }),
  component: ServicePage,
});

function ServicePage() {
  const highlights = [
    "Bank-ready Detailed Project Reports (DPR)",
    "NABARD subsidy eligibility & documentation",
    "Technical feasibility & financial viability analysis",
    "Loan application & bank coordination",
    "Expert technical consulting for unit setup",
    "ROI & cash flow projections",
    "Market linkage & scalability strategy",
    "Government scheme integration"
  ];

  const titleParts = "Poultry Farming Project Reports".split(' ');
  const mainTitle = titleParts.slice(0, -1).join(' ');
  const highlightWord = titleParts[titleParts.length - 1];

  return (
    <>
      <PageHero
        eyebrow="Agri Consulting"
        title={<>{mainTitle} <span className="text-gradient-gold">{highlightWord}</span></>}
        description="We provide comprehensive support for securing bank loans and setting up profitable agriculture units."
      >
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="gradient-gold text-gold-foreground hover:opacity-90 h-14 px-12 text-lg font-bold shadow-gold transition-all hover:scale-[1.05] rounded-2xl">
            <Link to="/register" search={{ service: "poultry-project-report" }}>Register Now <ArrowRight className="ml-2 w-5 h-5" /></Link>
          </Button>
        </div>
      </PageHero>

      <section className="section-padding bg-background">
        <div className="container-px mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Expert Support for <span className="text-gradient-primary">Poultry Farming Project Reports</span>
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">
                Securing finance for agriculture projects requires precise documentation and technical expertise. Our team of specialists ensures your poultry farming project reports meets all banking and subsidy requirements, maximizing your chances of approval and success.
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
                  <Egg className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">Professional DPR Preparation</h3>
                <p className="text-sm text-muted-foreground mb-6">Get a professional Detailed Project Report that banks trust. Includes full financial projections and technical specifications.</p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/contact">Get a Quote</Link>
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding gradient-cream">
        <div className="container-px mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-foreground">Start Your Project <span className="text-gradient-primary">Today</span></h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Talk to our agri-finance experts about your loan and project requirements.</p>
          <Button asChild size="lg" className="mt-8 gradient-primary text-primary-foreground hover:opacity-90 h-12 px-7">
            <Link to="/contact"><Phone className="mr-2 w-4 h-4" /> Book Consultation</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
