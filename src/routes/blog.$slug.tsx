import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageHero } from "@/components/site/PageHero";
import { Calendar, Clock, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPost,
});

function BlogPost() {
  const { slug } = Route.useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      const { data } = await supabase.from("blogs").select("*").eq("slug", slug).single();
      if (data) setPost(data);
      setLoading(false);
    }
    fetchPost();

    // Setup realtime subscription for this specific post
    const channel = supabase.channel(`public:blogs:${slug}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'blogs', filter: `slug=eq.${slug}` }, payload => {
        setPost(payload.new);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'blogs', filter: `slug=eq.${slug}` }, () => {
        setPost(null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading article...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
        <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist or has been removed.</p>
        <Link to="/blog" className="text-primary hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHero eyebrow="Blog Post" title={post.title} description={post.excerpt} />
      <article className="section-padding container-px mx-auto max-w-4xl">
        <Link to="/blog" className="inline-flex items-center gap-2 text-primary hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to articles
        </Link>
        
        {post.image_url && (
          <img src={post.image_url} alt={post.title} className="w-full aspect-[2/1] object-cover rounded-3xl mb-8 shadow-elegant" />
        )}
        
        <div className="flex gap-6 text-sm text-muted-foreground mb-8 pb-8 border-b border-border">
          <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {post.date}</span>
          <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {post.read_time}</span>
        </div>
        
        <div 
          className="prose prose-lg dark:prose-invert max-w-none text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.content || '' }}
        />
      </article>
    </>
  );
}
