import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Users, Target, Heart, ArrowRight, CheckCircle } from "lucide-react";
import studentsImg from "@/assets/students.jpg";
import founderImg from "@/assets/krushikutafounder.png";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Krishikuta" },
      { name: "description", content: "Learn about Krishikuta — India's trusted destination for agriculture government exam coaching, ICAR training and agri-business consulting since 2010." },
      { property: "og:title", content: "About Krishikuta" },
      { property: "og:description", content: "Empowering students, farmers and entrepreneurs across India's agriculture ecosystem." },
      { property: "og:image", content: studentsImg },
    ],
  }),
  component: About,
});

function About() {
  const values = [
    { icon: Target, title: "Mission Driven", desc: "Empowering aspirants with quality education and entrepreneurs with sound business guidance." },
    { icon: Award, title: "Proven Excellence", desc: "720+ successful agri-projects delivered." },
    { icon: Users, title: "Expert Mentors", desc: "Faculty drawn from ICAR, agriculture departments and successful agri-businesses." },
    { icon: Heart, title: "Student First", desc: "Personal mentorship, transparent pricing and lifetime support after enrollment." },
  ];
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title={<>India's Trusted <span className="text-gradient-gold">Agriculture Institute</span></>}
        description="Since 2010, Krishikuta has been shaping agriculture careers, businesses and futures across India."
      />

      {/* MEET OUR FOUNDER SECTION */}
      <section className="section-padding bg-muted/30">
        <div className="container-px mx-auto max-w-7xl">
          <Card className="p-8 md:p-12 border-border shadow-elegant bg-card overflow-hidden">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-4">
                <div className="relative">
                  <div className="w-full aspect-square rounded-full overflow-hidden border-4 border-primary/20 shadow-soft">
                    <img
                      src={founderImg}
                      alt="Venkataramana - Founder of Krishikuta"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: "center 10%" }}
                    />
                  </div>
                  <div className="absolute -bottom-4 -right-4 bg-primary text-primary-foreground px-6 py-2 rounded-full font-bold shadow-soft">
                    11+ Years Exp
                  </div>
                </div>
              </div>
              <div className="lg:col-span-8">
                <h2 className="text-4xl font-serif font-bold text-foreground">Venkataramana <span className="text-2xl font-sans font-normal text-muted-foreground ml-2">MSc, Agri</span></h2>
                <h3 className="text-xl font-bold text-primary mt-2">Founder - Krishikuta, Hoskote</h3>

                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                  Over 11+ years of experience in agri coaching
                </div>

                <div className="mt-10 grid md:grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    "Annadata producer, RFC, Hyderabad",
                    "Sharad Krishi - Executive editor, Pune",
                    "Technical co-ordinator - JSYS. UAS, GKVK",
                    "Regional Manager - Nirmal seeds, Maharashtra",
                    "E.O. Dunkens Biotech, Calcutta",
                    "Manager IAHS, Banashankari, Bangalore"
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 group">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <span className="text-muted-foreground text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>
      <section className="section-padding bg-background">
        <div className="container-px mx-auto max-w-7xl grid lg:grid-cols-2 gap-12 items-center">
          <div className="rounded-3xl overflow-hidden shadow-elegant">
            <img src={studentsImg} alt="Students learning agriculture" width={1280} height={800} loading="lazy" className="w-full h-full object-cover aspect-[4/3]" />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Where Agriculture Careers <span className="text-gradient-primary">Begin</span></h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Krishikuta is a premium agriculture education and consulting organization
              dedicated to building India's next generation of agriculture officers, scientists,
              entrepreneurs and farm-business leaders.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Our integrated model combines structured coaching for government exams and ICAR,
              hands-on practical training, NABARD-aligned project consulting and business mentorship —
              all under one roof.
            </p>
            <Button asChild className="mt-7 gradient-primary text-primary-foreground hover:opacity-90">
              <Link to="/contact">Talk to an Advisor <ArrowRight className="ml-1 w-4 h-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="section-padding gradient-cream">
        <div className="container-px mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Our Core Values</h2>
            <p className="mt-3 text-muted-foreground">Principles that shape every program, project and consultation.</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <Card key={v.title} className="p-6 border-border hover:shadow-elegant transition-all">
                <div className="w-12 h-12 rounded-xl gradient-primary grid place-items-center mb-5">
                  <v.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
