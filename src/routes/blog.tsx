import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, ArrowRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Agriculture Blog — Career, Coaching & Agri-Business Insights" },
      { name: "description", content: "Expert articles on agriculture government exams, ICAR preparation, polyhouse investment, poultry farming, NABARD loans and agri-career opportunities." },
    ],
  }),
  component: Blog,
});

function Blog() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      const { data } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
      if (data) setPosts(data);
      setLoading(false);
    }
    fetchPosts();
  }, []);

  return (
    <>
      <PageHero
        eyebrow="Blog"
        title={<>Insights on <span className="text-gradient-gold">Agriculture & Careers</span></>}
        description="Expert guides on government exams, agri-business setup, NABARD loans and ICAR preparation."
      />
      <section className="section-padding bg-background">
        <div className="container-px mx-auto max-w-7xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="mt-4 text-muted-foreground">Loading expert insights...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 border border-dashed rounded-3xl">
              <p className="text-muted-foreground text-lg">No blog posts found. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((b) => (
                <Card key={b.id} className="overflow-hidden border-border group hover:shadow-elegant transition-all">
                  <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                    {b.image_url ? (
                      <img 
                        src={b.image_url} 
                        alt={b.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                          if (placeholder) placeholder.style.display = 'grid';
                        }}
                      />
                    ) : null}
                    <div 
                      className="absolute inset-0 gradient-primary grid place-items-center text-primary-foreground/30 font-display text-6xl font-bold"
                      style={{ display: b.image_url ? 'none' : 'grid' }}
                    >
                      AC
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {b.date}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {b.read_time}</span>
                    </div>
                    <h2 className="mt-3 text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                      {b.title}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">{b.excerpt}</p>
                    <a href="#" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all">
                      Read article <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
