import { useEffect, useState } from "react";
import { services } from "@/lib/site-data";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function ServicesPopup() {
  const [activeServiceIdx, setActiveServiceIdx] = useState<number | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const fetchActivePopup = async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('id, value')
        .like('id', 'popup_%');

      if (data) {
        // Robust check for boolean value (handles true, "true", or 1)
        const active = data.find(d => d.value === true || d.value === "true" || d.value === 1);
        if (active) {
          const idx = parseInt(active.id.split('_')[1]);
          if (!isNaN(idx) && idx >= 0 && idx < services.length) {
            // Check if this specific popup has been closed in this session
            if (sessionStorage.getItem(`closedServicePopup_${idx}`)) {
              setClosed(true);
              return;
            }
            // Minimal delay
            // Reset closed state and set index
            setActiveServiceIdx(idx);
            setClosed(false);
          }
        } else {
          setActiveServiceIdx(null);
        }
      }
    };
    
    fetchActivePopup();

    const handleAdminToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      const idx = customEvent.detail.idx;
      if (idx !== null) {
        sessionStorage.removeItem(`closedServicePopup_${idx}`);
      }
      setActiveServiceIdx(idx);
      setClosed(false); // Reopen instantly for preview
    };
    window.addEventListener("servicesPopupSelected", handleAdminToggle);
    return () => window.removeEventListener("servicesPopupSelected", handleAdminToggle);
  }, []);

  if (activeServiceIdx === null) return null;

  const service = services[activeServiceIdx];

  const handleClose = () => {
    setClosed(true);
    sessionStorage.setItem(`closedServicePopup_${activeServiceIdx}`, "true");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <Dialog open={!closed} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border border-white/10 bg-background/95 backdrop-blur-2xl shadow-2xl sm:rounded-3xl [&>button]:hidden">
        
        {/* Custom Close Button Wrapper */}
        <div className="absolute top-4 right-4 z-[60]">
          <button 
            onClick={() => handleOpenChange(false)}
            className="bg-background/80 backdrop-blur-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-full transition-all shadow-sm cursor-pointer flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Glowing backdrop effect behind the card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-gold via-primary to-gold opacity-20 blur-xl pointer-events-none transition duration-700"></div>
        
        {/* Decorative background gradients */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-gold/20 rounded-full blur-2xl pointer-events-none"></div>

        {/* Content Container */}
        <div className="relative z-10 p-8 flex flex-col items-center text-center group">
          
          {/* Header: Featured Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-[11px] font-bold uppercase tracking-widest text-primary border border-primary/20 shadow-sm mb-6">
            <Sparkles className="w-3.5 h-3.5 text-gold" /> Featured Program
          </span>

          {/* Icon */}
          <div className="w-20 h-20 rounded-3xl gradient-primary shadow-elegant flex items-center justify-center mb-6 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-500">
            <service.icon className="w-10 h-10 text-primary-foreground" />
          </div>
          
          {/* Text Content */}
          <h3 className="text-2xl font-bold text-foreground leading-tight mb-3 group-hover:text-primary transition-colors duration-300">
            {service.title}
          </h3>
          
          <p className="text-base text-muted-foreground line-clamp-3 mb-8 leading-relaxed px-2">
            {service.desc}
          </p>
          
          {/* Call to Action Buttons */}
          <div className="w-full flex flex-col gap-3">
            <Link 
              to="/register"
              search={{ service: service.slug }}
              onClick={() => handleOpenChange(false)}
              className="relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl p-4 font-semibold text-white text-lg shadow-elegant transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="absolute inset-0 gradient-primary transition-opacity duration-300 opacity-100 group-hover:opacity-90"></span>
              <span className="relative flex items-center gap-2">
                Register Now
              </span>
            </Link>
            
            <Link 
              to={service.href as any}
              onClick={() => handleOpenChange(false)}
              className="relative inline-flex w-full items-center justify-center rounded-xl p-3.5 font-semibold text-foreground bg-secondary hover:bg-muted transition-colors duration-300 shadow-sm border border-border"
            >
              Explore Now <ArrowRight className="w-4 h-4 ml-1.5 opacity-70 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}
