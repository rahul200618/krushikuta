import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Microscope, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import logoImage from "@/assets/transparent-image.png";

export const Route = createFileRoute("/services/practical-exam-coaching")({
  head: () => ({
    meta: [
      { title: "Agriculture Practical Exam Coaching — Krishikuta" },
      { name: "description", content: "Hands-on training and expert guidance for agriculture practical exams." },
    ],
  }),
  component: ServicePage,
});

function ServicePage() {
  const highlights = [
    "In-depth practical demonstrations",
    "Hands-on equipment training",
    "Expert faculty from top agri-universities",
    "Mock practical tests",
    "Viva-voce preparation",
    "Record book guidance",
    "Specimen identification training",
    "Field-based learning modules"
  ];

  return (
    <>
      <div className="relative pt-24 pb-16 overflow-hidden min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-[#e0f7e9] via-[#eef9f2] to-[#e0f7e9]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent pointer-events-none"></div>
        <div className="container-px mx-auto max-w-5xl relative z-10 flex flex-col items-center text-center">
          
          {/* Logo Pill */}
          <div className="mb-8 inline-block">
            <img 
              src={logoImage} 
              alt="Krishikuta Logo" 
              className="h-16 md:h-24 w-auto object-contain"
            />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-800 text-sm font-semibold mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Official Pattern for 2026
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-[#0a192f] leading-tight mb-2 tracking-tight">
            Karnataka State Agriculture
          </h1>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-green-700 leading-tight mb-8 tracking-tight">
            Practical Coaching - 2026
          </h1>

          {/* Stats Banner */}
          <div className="bg-[#fff9e6] border border-[#f7e0a3] text-[#8c6d1f] rounded-xl md:rounded-full px-6 py-3 font-semibold text-sm md:text-base mb-8 shadow-sm inline-flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center">
            <span>11+ Years in Agri Practical Coaching 🏆</span>
            <span className="hidden md:inline text-[#d4b76a]">|</span>
            <span>Our Students are placed at Top Agri Universities 🎓</span>
          </div>

          {/* Location Card */}
          <div className="w-full max-w-3xl bg-white rounded-2xl md:rounded-full p-4 md:p-3 md:pl-6 shadow-md border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
            <div className="flex items-start md:items-center gap-3 text-left md:text-center">
              <span className="text-red-500 shrink-0 text-lg">📍</span>
              <div className="text-sm text-gray-600 font-medium">
                <span className="text-gray-900 font-bold">Offline Coaching:</span> Indo-American Nursery, Near Doddagattiganabbe Village,
                <br className="hidden md:block" />
                Chikkatirupathi Road, Hoskote-562114
              </div>
            </div>
            <a 
              href="https://maps.app.goo.gl/JGrboTZTp3zQLTfF7" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full md:w-auto bg-[#2563eb] hover:bg-blue-700 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Directions
            </a>
          </div>

          {/* Description */}
          <div className="text-lg md:text-xl text-gray-700 font-medium max-w-2xl mx-auto mb-6 leading-relaxed">
            The most trusted preparation module. Bridge the gap between theory and practical with <span className="text-green-700 font-bold border-b-2 border-green-500">real specimens</span>.
          </div>

          {/* Quote */}
          <div className="text-sm md:text-base text-gray-500 italic max-w-3xl mx-auto">
            "We have created a series of mock tests on all topics so that students will overcome exam fear and they will know their weakness and improve themselves."
          </div>

        </div>
      </div>

      <section className="section-padding bg-background">
        <div className="container-px mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Master the <span className="text-gradient-primary">Practical Skills</span>
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">
                Our coaching program is designed to bridge the gap between theory and practice. We provide students with the necessary exposure and confidence to excel in university and competitive practical examinations.
              </p>
              <ul className="mt-7 grid sm:grid-cols-2 gap-3">
                {highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm text-foreground/85">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> {h}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4">
              <Card className="p-8 border-primary/20 bg-primary/5 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl gradient-primary grid place-items-center mb-6">
                  <Microscope className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">Hands-on Batch</h3>
                <p className="text-sm text-muted-foreground mb-6">Limited batch size for personalized attention during field and lab demonstrations.</p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/contact">Enquire Now</Link>
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding gradient-cream">
        <div className="container-px mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-foreground">Prepare for <span className="text-gradient-primary">Excellence</span></h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Join our upcoming batch for the most comprehensive practical coaching.</p>
          <Button asChild size="lg" className="mt-8 gradient-primary text-primary-foreground hover:opacity-90 h-12 px-7">
            <Link to="/contact"><Phone className="mr-2 w-4 h-4" /> Get Free Consultation</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
