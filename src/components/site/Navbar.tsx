import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X, Phone, User, LogOut, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import logoImage from "../../assets/transparent-image.png";
import { ExamAuthModal } from "@/components/exam/ExamAuthModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/results", label: "Results" },
  { to: "/ao/aao", label: "AO/AAO" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar({ isExamPage }: { isExamPage?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
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
    navigate({ to: "/ao/aao" });
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
              target={l.to === "/ao/aao" ? "_blank" : undefined}
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-85 cursor-pointer outline-none border-0 bg-transparent">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <span className="hidden sm:inline-block">Profile</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate({ to: "/ao/aao" as any })} className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowConfirmLogout(true)} 
                      className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button 
                onClick={() => navigate({ to: '/ao/aao/auth' as any })} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold shadow-soft"
              >
                Login / Signup
              </Button>
            )
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {isExamPage && !user && (
            <Button 
              onClick={() => navigate({ to: '/ao/aao/auth' as any })} 
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold shadow-soft text-xs py-1 px-3"
            >
              Login / Signup
            </Button>
          )}
          <button
            className="p-2 text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="lg:hidden bg-background border-t border-border animate-fade-in">
          <div className="container-px mx-auto max-w-7xl py-4 flex flex-col gap-1">
            {!isExamPage ? navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                target={l.to === "/ao/aao" ? "_blank" : undefined}
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="px-3 py-2.5 flex items-center gap-3 text-sm font-medium text-foreground hover:bg-accent rounded-md w-full text-left outline-none border-0 bg-transparent cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        Profile
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[calc(100vw-2rem)] mx-4">
                      <DropdownMenuItem onClick={() => { setOpen(false); navigate({ to: "/ao/aao" as any }); }} className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => { setOpen(false); setShowConfirmLogout(true); }} 
                        className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button 
                  onClick={() => { setOpen(false); navigate({ to: '/ao/aao/auth' as any }); }} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold shadow-soft justify-center py-2.5 w-full mt-2"
                >
                  Login / Signup
                </Button>
              )
            )}
          </div>
        </div>
      )}
      <ExamAuthModal open={showAuthModal} onOpenChange={setShowAuthModal} onSuccess={() => setShowAuthModal(false)} />
      
      <AlertDialog open={showConfirmLogout} onOpenChange={setShowConfirmLogout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out of Krishikuta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              className="bg-destructive hover:bg-destructive/90 text-white cursor-pointer"
            >
              Confirm Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
