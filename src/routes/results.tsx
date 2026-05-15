import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/card";
import { Star, Trophy, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results & Testimonials — Krishikuta" },
      { name: "description", content: "720+ successful agri-entrepreneurs and 5,000+ trained students. Read student success stories." },
    ],
  }),
  component: Results,
});

function Results() {
  const [selections, setSelections] = useState<any[]>([]);
  const [dbTestimonials, setDbTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: resData } = await supabase.from('results').select('*').order('created_at', { ascending: false });
      if (resData) setSelections(resData);
      
      const { data: testData } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false });
      if (testData) setDbTestimonials(testData);
      
      setLoading(false);
    }
    fetchData();

    const channel = supabase.channel('public:results_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'testimonials' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      <PageHero
        eyebrow="Results & Achievements"
        title={<>A Legacy of <span className="text-gradient-gold">Measurable Impact</span></>}
        description="Government selections, agri-business successes and student stories that drive us forward."
      />
      <section className="section-padding bg-background">
        <div className="container-px mx-auto max-w-7xl">
          <div className="grid sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
            {[
              { num: "720+", label: "Agri Entrepreneurs" },
              { num: "₹120Cr+", label: "Loans Facilitated" },
              { num: "98%", label: "Satisfaction Rate" },
            ].map((i) => (
              <div key={i.label} className="p-8 text-center rounded-2xl bg-card border border-border shadow-soft">
                <div className="text-4xl md:text-5xl font-bold text-gradient-gold">{i.num}</div>
                <div className="mt-3 text-sm font-medium text-muted-foreground">{i.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-16">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">Recent Selections</h2>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : selections.length === 0 ? (
              <p className="text-center text-muted-foreground mt-8">No specific results uploaded yet.</p>
            ) : (
              <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selections.map((s) => (
                  <Card key={s.id} className="p-5 border-border flex gap-4 items-center hover:shadow-soft transition-all">
                    <div className="w-12 h-12 rounded-full gradient-gold grid place-items-center shrink-0 shadow-sm">
                      <Trophy className="w-6 h-6 text-gold-foreground" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{s.student_name}</div>
                      <div className="text-sm text-muted-foreground">{s.exam_name} · {s.year}</div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section-padding gradient-cream">
        <div className="container-px mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Student Testimonials</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dbTestimonials.length > 0 ? dbTestimonials.map((t) => (
              <Card key={t.id} className="p-6 border-border hover:shadow-elegant transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {t.image_url ? (
                      <img src={t.image_url} alt={t.student_name} className="w-full h-full object-cover" />
                    ) : (
                      <Star className="w-5 h-5 text-gold fill-gold" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{t.student_name}</div>
                    <div className="text-xs text-muted-foreground uppercase">{t.program}</div>
                  </div>
                </div>
                <div className="flex gap-1 text-gold mb-3">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                </div>
                <p className="text-foreground/85 leading-relaxed text-sm italic">"{t.content}"</p>
              </Card>
            )) : (
              <div className="col-span-full text-center text-muted-foreground py-8">No testimonials available yet.</div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
