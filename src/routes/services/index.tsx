import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "../../components/site/PageHero";
import { services } from "../../lib/site-data";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ArrowRight, FileCheck, ShieldCheck, PieChart, GraduationCap, Briefcase, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Comprehensive Agriculture Services — Krishikuta" },
      { name: "description", content: "From exam coaching and admission guidance to agri-consulting and banking project reports." },
    ],
  }),
  component: ServicesIndex,
});

function ServicesIndex() {
  // Categorize services based on the current 11-item array in site-data.ts
  const academicServices = services.slice(0, 6); // First 6: Coaching & Admissions
  const agriConsultingMain = services.slice(6, 7); // 7th: Agri Consulting Main
  const bankingReports = services.slice(7, 11); // Last 4: Banking Reports

  return (
    <>
      <PageHero
        eyebrow="All Expertise"
        title={<>Comprehensive <span className="text-gradient-gold">Agriculture Services</span></>}
        description="Your one-stop destination for agriculture coaching, admission guidance, and professional consulting."
      />

      {/* Academic Coaching & Admissions Section */}
      <section className="section-padding bg-background">
        <div className="container-px mx-auto max-w-7xl">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">Coaching & Admissions</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {academicServices.map((s) => (
              <Card key={s.slug} className="group border-border hover:shadow-elegant transition-all overflow-hidden flex flex-col">
                <div className="p-8 flex-1">
                  <div className="w-12 h-12 rounded-2xl gradient-primary grid place-items-center mb-6 group-hover:scale-110 transition-transform">
                    <s.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
                <div className="px-8 py-4 bg-muted/30 border-t border-border mt-auto">
                  <Link 
                    to={s.href as any} 
                    className="inline-flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-3 transition-all"
                  >
                    View {s.title} Details <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATED AGRI CONSULTING SECTION */}
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
                  <div className="px-8 py-6 bg-muted/30 border-t border-border mt-auto">
                    <Link 
                      to={s.href as any} 
                      className="inline-flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-3 transition-all"
                    >
                      Explore Consulting Services <ArrowRight className="w-4 h-4" />
                    </Link>
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
    </>
  );
}
