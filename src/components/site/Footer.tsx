import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Youtube, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import logoImage from "../../assets/transparent-image.png";

export function Footer() {
  const handlePhoneClick = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText("+919108652322");
      toast.success("Phone number copied to clipboard!");
    }
  };

  return (
    <footer className="bg-foreground text-background mt-20">
      <div className="container-px mx-auto max-w-7xl py-16 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center -ml-2 md:-ml-4">
            <img 
              src={logoImage} 
              alt="Krishikuta Logo" 
              className="h-16 md:h-20 w-auto object-contain brightness-0 invert" 
            />
          </div>
          <p className="mt-4 text-sm text-background/70 leading-relaxed">
            Premier institute for professional agri-consulting, bankable project reports, and
            expert guidance for modern farming ventures.
          </p>
          <div className="flex gap-3 mt-5">
            {[
              { Icon: Instagram, href: "https://instagram.com/krishikuta" },
              { Icon: Youtube, href: "https://youtube.com/@krishikuta" },
            ].map((s, i) => (
              <a
                key={i}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="grid place-items-center w-9 h-9 rounded-full bg-background/10 hover:bg-primary transition-colors"
                aria-label={`Visit our ${s.Icon.name}`}
              >
                <s.Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-4 text-base">Quick Links</h3>
          <ul className="space-y-2 text-sm text-background/70">
            <li><Link to="/about" className="hover:text-gold">About Us</Link></li>
            <li><Link to="/services" className="hover:text-gold">All Services</Link></li>
            <li><Link to="/results" className="hover:text-gold">Results</Link></li>
            <li><Link to="/blog" className="hover:text-gold">Blog</Link></li>
            <li><Link to="/contact" className="hover:text-gold">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-4 text-base">Our Services</h3>
          <ul className="space-y-2 text-sm text-background/70">
            <li><Link to="/services/practical-exam-coaching" className="hover:text-gold transition-colors">Practical Exam Coaching</Link></li>
            <li><Link to="/services/ao-aao-bank-exam" className="hover:text-gold transition-colors">AO / AAO / Bank Exam Prep</Link></li>
            <li><Link to="/services/icar-exam-prep" className="hover:text-gold transition-colors">ICAR Exam Prep Guide</Link></li>
            <li><Link to="/services/vci-veterinary-admission" className="hover:text-gold transition-colors">VCI & NRI Admission Help</Link></li>
            <li><Link to="/services/kcet-seat-allocation" className="hover:text-gold transition-colors">K-CET Seat Allocation</Link></li>
            <li><Link to="/services/agri-consulting-dpr" className="hover:text-gold transition-colors">Agri Consulting</Link></li>
            <li><Link to="/services/agri-consulting-reports" className="hover:text-gold transition-colors">Banking Project Reports</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-4 text-base">Contact</h3>
          <ul className="space-y-3 text-sm text-background/70">
            <li className="flex gap-2">
              <a href="https://maps.app.goo.gl/JGrboTZTp3zQLTfF7" target="_blank" rel="noopener noreferrer" className="flex gap-2 hover:text-white transition-colors">
                <MapPin className="w-4 h-4 mt-0.5 text-gold" /> KRISHIKUTA - AGRICULTURE PRACTICAL TEST 2025 KRISHIKUTA AGRI COACHING CLASSES
              </a>
            </li>
            <li className="flex gap-2">
              <a 
                href="tel:+919108652322" 
                onClick={handlePhoneClick}
                className="flex gap-2 hover:text-white transition-colors"
                title="Click to call / Copy to clipboard"
              >
                <Phone className="w-4 h-4 mt-0.5 text-gold" /> +91 9108652322
              </a>
            </li>
            <li className="flex gap-2"><Mail className="w-4 h-4 mt-0.5 text-gold" /> connect@krishikuta.in</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-background/10">
        <div className="container-px mx-auto max-w-7xl py-5 text-xs text-background/60 flex flex-col sm:flex-row gap-2 justify-between">
          <p>© {new Date().getFullYear()} Krishikuta. All rights reserved. <span className="mx-1">|</span> Developed by <a href="https://openalgon.com/" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors font-medium">OpenAlgon</a></p>
          <p>Building agriculture careers and businesses since 2010.</p>
        </div>
      </div>
    </footer>
  );
}
