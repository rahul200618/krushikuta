import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { ArrowRight, CheckCircle2, Users, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/services/nri-quota-admission")({
  head: () => ({
    meta: [
      { title: "NRI Quota Admission Guide — Krishikuta" },
      { name: "description", content: "Guidance for NRI quota admissions in Veterinary, BSc Agri, and Farm Science courses." },
    ],
  }),
  component: ServicePage,
});

function ServicePage() {
  const highlights = [
    "Veterinary (BVSc) NRI quota help",
    "BSc Agri & Horticulture guidance",
    "Forestry & Sericulture support",
    "Eligibility & document preparation",
    "University-wise seat availability",
    "Application form processing",
    "Choice filling & seat allotment",
    "International student assistance"
  ];

  return (
    <>
      <PageHero
        eyebrow="Global Admissions"
        title={<>NRI Quota <span className="text-gradient-gold">Admission Guide</span></>}
        description="Complete guidance for students seeking admissions under the NRI quota in top agriculture and veterinary universities."
      >
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="gradient-gold text-gold-foreground hover:opacity-90 h-14 px-12 text-lg font-bold shadow-gold transition-all hover:scale-[1.05] rounded-2xl">
            <Link to="/register" search={{ service: "nri-quota-admission" }}>Register Now <ArrowRight className="ml-2 w-5 h-5" /></Link>
          </Button>
        </div>
      </PageHero>

      <section className="section-padding bg-background">
        <div className="container-px mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Simplify Your <span className="text-gradient-primary">NRI Admission</span>
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">
                Applying under the NRI quota involves specific documentation and university-level procedures. We help you understand the requirements and navigate the application process smoothly to secure your admission in prestigious farm science and veterinary courses.
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
                  <Users className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">NRI Support Desk</h3>
                <p className="text-sm text-muted-foreground mb-6">Dedicated support for document verification and university applications for NRI candidates.</p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/contact">Get Assistance</Link>
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding gradient-cream">
        <div className="container-px mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-foreground">Launch Your <span className="text-gradient-primary">Global Career</span></h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Talk to our NRI admission experts today for a seamless application experience.</p>
          <Button asChild size="lg" className="mt-8 gradient-primary text-primary-foreground hover:opacity-90 h-12 px-7">
            <Link to="/contact"><Phone className="mr-2 w-4 h-4" /> Enquire Now</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
