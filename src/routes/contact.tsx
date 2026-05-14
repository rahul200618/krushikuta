import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Send, MessageCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Krishikuta — Book Consultation" },
      { name: "description", content: "Get in touch for agriculture exam coaching, ICAR training, agri-business consulting or bank loan project reports. Call, WhatsApp or visit us." },
      { property: "og:title", content: "Contact Krishikuta" },
      { property: "og:description", content: "Talk to our advisors about courses, consulting or project funding." },
    ],
  }),
  component: Contact,
});

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

  const handlePhoneClick = (e: React.MouseEvent, label: string) => {
    if (label === "Call Us" || label === "WhatsApp") {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText("+919108652322");
        toast.success(`${label} number copied to clipboard!`);
      }
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={<>Let's <span className="text-gradient-gold">Talk Agriculture</span></>}
        description="Reach our advisors about courses, consulting or project funding — we typically respond within a few hours."
      />
      <section className="section-padding bg-background">
        <div className="container-px mx-auto max-w-7xl grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[
              { icon: Phone, label: "Call Us", value: "+91 9108652322", href: "tel:+919108652322" },
              { icon: MessageCircle, label: "WhatsApp", value: "+91 9108652322", href: "https://wa.me/919108652322" },
              { icon: Mail, label: "Email", value: "connect@krishikuta.in", href: "mailto:connect@krishikuta.in" },
              { icon: MapPin, label: "Visit", value: "KRISHIKUTA - AGRICULTURE PRACTICAL TEST 2025 KRISHIKUTA AGRI COACHING CLASSES", href: "https://maps.app.goo.gl/JGrboTZTp3zQLTfF7" },
            ].map((i) => (
              <a 
                key={i.label} 
                href={i.href ?? "#"} 
                onClick={(e) => handlePhoneClick(e, i.label)}
                className="block p-5 rounded-2xl bg-card border border-border hover:shadow-soft transition-all"
                title={i.label === "Call Us" ? "Click to call / Copy to clipboard" : undefined}
              >
                <div className="flex gap-4 items-start">
                  <div className="w-11 h-11 rounded-xl gradient-primary grid place-items-center shrink-0">
                    <i.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{i.label}</div>
                    <div className="mt-1 font-semibold text-foreground">{i.value}</div>
                  </div>
                </div>
              </a>
            ))}
            <div className="rounded-2xl overflow-hidden border border-border h-64">
              <iframe 
                title="Location Main" 
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
                <h2 className="text-2xl font-bold text-foreground">Send an Inquiry</h2>
                <p className="text-sm text-muted-foreground mt-1">Tell us about your goals — courses, consulting or loan support.</p>
                <form className="mt-6 grid sm:grid-cols-2 gap-4" onSubmit={handleSubmit}>
                  <Input name="fullName" placeholder="Full Name" required />
                  <Input name="phone" placeholder="Phone" type="tel" required />
                  <Input name="email" placeholder="Email" type="email" required className="sm:col-span-2" />
                  <Input name="interest" placeholder="I'm interested in..." className="sm:col-span-2" />
                  <Textarea name="message" placeholder="Tell us more..." rows={5} className="sm:col-span-2" />
                  <Button disabled={isSubmitting} type="submit" size="lg" className="sm:col-span-2 gradient-primary text-primary-foreground hover:opacity-90 transition-all">
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Sending...</>
                    ) : (
                      <>Send Inquiry <Send className="ml-2 w-4 h-4" /></>
                    )}
                  </Button>
                </form>
              </>
            )}
          </Card>
        </div>
      </section>
    </>
  );
}
