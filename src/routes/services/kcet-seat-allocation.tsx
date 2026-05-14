import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { ArrowRight, CheckCircle2, ClipboardList, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/services/kcet-seat-allocation")({
  head: () => ({
    meta: [
      { title: "K-CET Seat Allocation Guide — Krishikuta" },
      { name: "description", content: "Complete assistance from the 1st round to final seat allotment in KCET." },
    ],
  }),
  component: ServicePage,
});

function ServicePage() {
  const highlights = [
    "Full rounds support (1st to Final)",
    "Document upload & verification help",
    "Smart option entry strategy",
    "Mock allotment analysis",
    "Category-wise seat guidance",
    "Choice selection (Freeze/Float) help",
    "College ranking & review data",
    "Reporting and admission support"
  ];

  return (
    <>
      <PageHero
        eyebrow="State Level Support"
        title={<>K-CET Seat <span className="text-gradient-gold">Allocation Help</span></>}
        description="End-to-end guidance from the first round of option entry to the final seat allotment in KCET."
      >
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="gradient-gold text-gold-foreground hover:opacity-90 h-14 px-12 text-lg font-bold shadow-gold transition-all hover:scale-[1.05] rounded-2xl">
            <Link to="/register" search={{ service: "kcet-seat-allocation" }}>Register Now <ArrowRight className="ml-2 w-5 h-5" /></Link>
          </Button>
        </div>
      </PageHero>

      <section className="section-padding bg-background">
        <div className="container-px mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Get the Best <span className="text-gradient-primary">College for Your Rank</span>
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">
                The KCET seat allocation process can be overwhelming. One small mistake in option entry can cost you a better college. Our experts guide you through every step to ensure you get the best possible outcome based on your rank and category.
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
                  <ClipboardList className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">Admission Strategy</h3>
                <p className="text-sm text-muted-foreground mb-6">Personalized option entry lists based on your rank and college preferences.</p>
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
          <h2 className="text-3xl font-bold text-foreground">Don't Leave It to <span className="text-gradient-primary">Chance</span></h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Get professional help for your K-CET admission journey.</p>
          <Button asChild size="lg" className="mt-8 gradient-primary text-primary-foreground hover:opacity-90 h-12 px-7">
            <Link to="/contact"><Phone className="mr-2 w-4 h-4" /> Book Consultation</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
