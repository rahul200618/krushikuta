import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Sparkles, Phone, Mail, MapPin, Send, ChevronRight, Briefcase, GraduationCap, ArrowRight, ShieldCheck, FileCheck, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeader } from "@/components/site/Section";
import { services } from "@/lib/site-data";
import heroImg from "@/assets/hero-agriculture.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Krishikuta-Agriculture coaching institute" },
      { name: "description", content: "Premier institute for professional agri-consulting, bankable project reports, and expert guidance for modern farming ventures." },
    ],
  }),
  component: Index,
});

function Index() {
  const scrollToServices = () => {
    const el = document.getElementById("services");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col">
      <section className="relative min-h-[95vh] flex items-start overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImg}
            alt="Agriculture field"
            className="w-full h-full object-cover"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/60 to-transparent" />
        </div>

        <div className="container-px mx-auto max-w-7xl relative z-10 pt-12 md:pt-20">
          <div className="max-w-3xl animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary-foreground text-xs font-bold uppercase tracking-widest mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Empowering Agriculture Careers
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-extrabold text-white leading-[1.1]">
              Build Your <span className="text-gradient-gold">Career & Future</span> in Agriculture
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/85 max-w-2xl leading-relaxed">
              Professional agri-consulting, bankable project reports, and expert guidance for modern farming ventures.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 md:gap-6">
              <Button 
                size="lg" 
                className="gradient-primary text-primary-foreground hover:opacity-90 h-14 px-8 text-lg font-bold shadow-soft transition-all hover:scale-105"
                onClick={scrollToServices}
              >
                Explore Agriculture Services
              </Button>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
      </section>

      <Services />
      <AgriConsulting />
      <Contact />
    </div>
  );
}

function ServiceBar({ s, idx }: { s: any; idx: number }) {
  return (
    <Link
      to={s.href as any}
      className="group flex items-center gap-5 p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-elegant hover:bg-primary/[0.03] transition-all duration-300"
      style={{ animationDelay: `${idx * 60}ms` }}
    >
      <div className="w-14 h-14 rounded-xl gradient-primary grid place-items-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-soft">
        <s.icon className="w-7 h-7 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">{s.title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed truncate">{s.desc}</p>
      </div>
      <div className="shrink-0 w-9 h-9 rounded-full border border-border flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300">
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary-foreground group-hover:translate-x-0.5 transition-all duration-300" />
      </div>
    </Link>
  );
}

function Services() {
  const mainServices = services.slice(0, 7);
  return (
    <section id="services" className="section-padding bg-background">
      <div className="container-px mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="What We Offer"
          title={<>Comprehensive <span className="text-gradient-primary">Agriculture Services</span></>}
          description="Specialized coaching, admission guidance, and professional consulting."
        />
        <div className="mt-12 flex flex-col gap-3 max-w-4xl mx-auto">
          {mainServices.map((s, idx) => (
            <ServiceBar key={s.title} s={s} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AgriConsulting() {
  const agriConsultingMain = services.slice(6, 7); // 7th: Agri Consulting Main
  const bankingReports = services.slice(7, 11); // Last 4: Banking Reports

  return (
    <section className="section-padding bg-muted/30 border-t border-border">
      <div className="container-px mx-auto max-w-7xl">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Agri Consulting</h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Consulting Pillar */}
          <div className="lg:col-span-2 space-y-6">
            {agriConsultingMain.map((s) => (
              <Card key={s.slug} className="group border-border hover:shadow-elegant transition-all overflow-hidden flex flex-col bg-card">
                <div className="p-8 flex-1">
                  <div className="w-12 h-12 rounded-2xl gradient-primary grid place-items-center mb-6 group-hover:scale-110 transition-transform">
                    <s.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">{s.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{s.desc}</p>
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <h4 className="font-bold text-xs text-primary uppercase mb-1">Project Reports</h4>
                      <p className="text-[10px] text-muted-foreground">Expert DPR preparation for all agricultural ventures.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <h4 className="font-bold text-xs text-primary uppercase mb-1">Banking Support</h4>
                      <p className="text-[10px] text-muted-foreground">End-to-end assistance for loan approvals and subsidies.</p>
                    </div>
                  </div>
                </div>
                <div className="px-8 py-6 bg-muted/30 border-t border-border mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <Link 
                    to={s.href as any} 
                    className="inline-flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-3 transition-all"
                  >
                    Explore Consulting Services <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Button asChild size="sm" className="gradient-primary text-primary-foreground shadow-soft">
                    <Link to="/register">Register for Training</Link>
                  </Button>
                </div>
              </Card>
            ))}
            
            {/* Trust Indicators */}
            <div className="grid md:grid-cols-3 gap-6 p-8 rounded-3xl bg-card border border-border shadow-sm">
               <div className="flex flex-col items-center text-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                  <h4 className="font-bold text-[10px] uppercase tracking-wider">NABARD Compliant</h4>
               </div>
               <div className="flex flex-col items-center text-center gap-3">
                  <FileCheck className="w-8 h-8 text-primary" />
                  <h4 className="font-bold text-[10px] uppercase tracking-wider">99% Approval Rate</h4>
               </div>
               <div className="flex flex-col items-center text-center gap-3">
                  <PieChart className="w-8 h-8 text-primary" />
                  <h4 className="font-bold text-[10px] uppercase tracking-wider">Financial Models</h4>
               </div>
            </div>
          </div>

          {/* NESTED BANKING REPORTS HUB */}
          <Card className="border-primary/20 shadow-lg bg-card overflow-hidden flex flex-col">
            <div className="p-6 bg-primary text-primary-foreground">
              <h3 className="text-lg font-bold">Banking Project Reports</h3>
              <p className="text-xs text-primary-foreground/80 mt-1">Ready-to-submit bankable DPRs for major sectors.</p>
            </div>
            <div className="flex-1 p-2 space-y-1">
              {bankingReports.map((s) => (
                <Link
                  key={s.slug}
                  to={s.href as any}
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <s.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold">{s.title}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
            <div className="p-6 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                * All reports follow standard bank and subsidy requirements.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      full_name: formData.get("fullName"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      interest: formData.get("interest"),
      message: formData.get("message")
    };

    const { error } = await supabase.from('inquiries').insert([data]);
    
    setIsSubmitting(false);

    if (error) {
      console.error(error);
      alert("Something went wrong. Please check your connection and try again.");
    } else {
      setSuccess(true);
      e.currentTarget.reset();
    }
  };

  return (
    <section id="contact" className="section-padding bg-background">
      <div className="container-px mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Get In Touch"
          title={<>Start Your <span className="text-gradient-primary">Agriculture Journey</span> Today</>}
          description="Talk to our advisors about consulting or project funding."
        />
        <div className="mt-12 grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[
              { icon: Phone, label: "Call Us", value: "+91 9108652322", href: "tel:+919108652322" },
              { icon: Mail, label: "Email", value: "connect@krishikuta.in", href: "mailto:connect@krishikuta.in" },
              { icon: MapPin, label: "Visit", value: "KRISHIKUTA - Hosakote", href: "https://maps.app.goo.gl/JGrboTZTp3zQLTfF7" },
            ].map((i) => (
              <a key={i.label} href={i.href ?? "#"} className="p-5 rounded-2xl bg-card border border-border flex gap-4 items-start hover:shadow-soft transition-all">
                <div className="w-11 h-11 rounded-xl gradient-primary grid place-items-center shrink-0">
                  <i.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{i.label}</div>
                  <div className="mt-1 font-semibold text-foreground">{i.value}</div>
                </div>
              </a>
            ))}
            <div className="rounded-2xl overflow-hidden border border-border h-64 mt-4">
              <iframe 
                title="Location Home" 
                src="https://maps.google.com/maps?q=KRISHIKUTA+-+AGRICULTURE+PRACTICAL+TEST+2025+KRISHIKUTA+AGRI+COACHING+CLASSES&t=&z=13&ie=UTF8&iwloc=&output=embed" 
                className="w-full h-full" 
                loading="lazy" 
              />
            </div>
          </div>
          <Card className="lg:col-span-3 p-6 border-border shadow-elegant h-fit flex flex-col">
            {success ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Message Sent!</h3>
                <p className="text-muted-foreground mb-6">Thank you for reaching out. We will get back to you shortly.</p>
                <Button onClick={() => setSuccess(false)} variant="outline">Send Another Message</Button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-foreground">Send an Inquiry</h3>
                <p className="text-sm text-muted-foreground mt-1">We typically reply within a few hours.</p>
                <form className="mt-6 grid sm:grid-cols-2 gap-4" onSubmit={handleSubmit}>
                  <Input name="fullName" placeholder="Full Name" required />
                  <Input name="phone" placeholder="Phone" type="tel" required />
                  <Input name="email" placeholder="Email" type="email" required className="sm:col-span-2" />
                  <Input name="interest" placeholder="Interest (e.g., Polyhouse, Loan)" className="sm:col-span-2" />
                  <Textarea name="message" placeholder="Tell us about your goals..." rows={5} className="sm:col-span-2" />
                  <Button disabled={isSubmitting} type="submit" size="lg" className="sm:col-span-2 gradient-primary text-primary-foreground hover:opacity-90">
                    {isSubmitting ? "Sending..." : "Send Business Inquiry"} <Send className="ml-2 w-4 h-4" />
                  </Button>
                </form>
              </>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
