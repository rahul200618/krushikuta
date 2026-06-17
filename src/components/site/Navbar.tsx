import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X, Phone, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import logoImage from "../../assets/transparent-image.png";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/results", label: "Results" },
  { to: "/exam", label: "Exam Portal" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar({ isExamPage }: { isExamPage?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handlePhoneClick = (e: React.MouseEvent) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText("+919108652322");
      toast.success("Phone number copied to clipboard!");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/exam" });
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled
          ? "bg-slate-100/90 backdrop-blur-md border-b border-border shadow-soft"
          : "bg-transparent"
        }`}
    >
      <nav className="container-px mx-auto max-w-7xl flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="flex items-center group -ml-2 md:-ml-4">
          <img 
            src={logoImage} 
            alt="Krishikuta Logo" 
            className="h-10 md:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
          />
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {!isExamPage ? navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              target={l.to === "/exam" ? "_blank" : undefined}
              className="px-3 py-2 text-sm font-medium text-foreground/80 hover:text-primary rounded-md transition-colors"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          )) : null}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          {!isExamPage ? (
            <a
              href="tel:+919108652322"
              onClick={handlePhoneClick}
              className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              title="Click to call / Copy to clipboard"
            >
              <Phone className="w-4 h-4" /> +91 9108652322
            </a>
          ) : (
            user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="hidden sm:inline-block">Profile</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </Button>
              </div>
            ) : null
          )}
        </div>

        <button
          className="lg:hidden p-2 text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {open && (
        <div className="lg:hidden bg-background border-t border-border animate-fade-in">
          <div className="container-px mx-auto max-w-7xl py-4 flex flex-col gap-1">
            {!isExamPage ? navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                target={l.to === "/exam" ? "_blank" : undefined}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-md text-sm font-medium text-foreground/80 hover:bg-accent"
                activeProps={{ className: "text-primary bg-accent" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            )) : (
              user ? (
                <>
                  <div className="px-3 py-2.5 flex items-center gap-3 text-sm font-medium text-foreground">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    Profile
                  </div>
                  <Button variant="ghost" className="justify-start px-3 py-2.5 text-muted-foreground hover:text-destructive w-full" onClick={() => { setOpen(false); handleLogout(); }}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </Button>
                </>
              ) : null
            )}
          </div>
        </div>
      )}
    </header>
  );
}
