import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2 } from "lucide-react";
import { services } from "@/lib/site-data";
import { useState } from "react";
import { submitRegistration } from "@/lib/exam-api";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      service: search.service as string | undefined,
    };
  },
  head: () => ({
    meta: [{ title: "Register for Programs — Krishikuta" }],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { service: initialService } = Route.useSearch();
  const [selectedService, setSelectedService] = useState(initialService || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      full_name: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      service_slug: selectedService,
      education: formData.get("education"),
      comments: formData.get("comments")
    };

    try {
      await submitRegistration(data);
      setSuccess(true);
      e.currentTarget.reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Join Us"
        title={<>Register <span className="text-gradient-primary">Now</span></>}
        description="Fill out the form below to register for our comprehensive agriculture services and programs."
      />
      <section className="section-padding bg-background">
        <div className="container-px mx-auto max-w-3xl">
          {success ? (
            <Card className="p-8 md:p-12 border-border shadow-elegant text-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">Registration Successful!</h2>
              <p className="text-muted-foreground text-lg mb-8">
                Thank you for registering. Our admissions team has received your details and will contact you shortly to confirm your enrollment.
              </p>
              <Button onClick={() => setSuccess(false)} variant="outline" size="lg">
                Submit Another Registration
              </Button>
            </Card>
          ) : (
            <Card className="p-6 md:p-8 border-border shadow-elegant">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-foreground">Program Registration</h2>
                <p className="text-muted-foreground mt-2">Start your journey toward a successful agriculture career today.</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
                    <Input name="fullName" placeholder="John Doe" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address <span className="text-destructive">*</span></label>
                    <Input name="email" type="email" placeholder="john@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number <span className="text-destructive">*</span></label>
                    <Input name="phone" type="tel" placeholder="+91 98765 43210" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Program <span className="text-destructive">*</span></label>
                    <Select value={selectedService} onValueChange={setSelectedService} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a service..." />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s.slug} value={s.slug}>{s.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Education Background (Optional)</label>
                  <Input name="education" placeholder="e.g. BSc Agriculture, 3rd Year" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Additional Questions/Comments</label>
                  <Textarea name="comments" placeholder="Is there anything specific you would like to know?" rows={4} />
                </div>
                
                <Button disabled={isSubmitting || !selectedService} type="submit" size="lg" className="w-full gradient-primary text-primary-foreground hover:opacity-90 mt-4 transition-all">
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 w-5 h-5 animate-spin" /> Submitting...</>
                  ) : (
                    <>Submit Registration <Send className="ml-2 w-4 h-4" /></>
                  )}
                </Button>
              </form>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
