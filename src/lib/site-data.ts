import {
  GraduationCap, BookOpen, Microscope, Egg, Sprout, Banknote,
  Briefcase, School, TrendingUp, Beef, Droplets, Rocket, FileText, Landmark, ClipboardList, Users
} from "lucide-react";

export const services = [
  { icon: Microscope, title: "Training / Agriculture Practical Exam Coaching", desc: "Expert guidance and training for agriculture practical examinations.", slug: "practical-exam-coaching", href: "/services/practical-exam-coaching" },
  { icon: GraduationCap, title: "AO / AAO / Bank Exam Prep Guide", desc: "Complete preparation for agriculture officer and banking entrance exams.", slug: "ao-aao-bank-exam", href: "/services/ao-aao-bank-exam" },
  { icon: BookOpen, title: "ICAR Exam Prep Guide", desc: "Structured coaching for ICAR JRF/SRF and postgraduate entrance exams.", slug: "icar-exam-prep", href: "/services/icar-exam-prep" },
  { icon: School, title: "VCI Veterinary Admission Guide", desc: "Admission assistance and counseling support for VCI quota seats.", slug: "vci-veterinary-admission", href: "/services/vci-veterinary-admission" },
  { icon: ClipboardList, title: "K-CET Seat Allocation Guide/Help", desc: "Support for K-CET seat allotment process from 1st round to final.", slug: "kcet-seat-allocation", href: "/services/kcet-seat-allocation" },
  { icon: Users, title: "NRI Quota Admission Guide", desc: "Guidance for NRI quota admissions in veterinary and farm science courses.", slug: "nri-quota-admission", href: "/services/nri-quota-admission" },
  { icon: FileText, title: "Agri Consulting", desc: "Professional banking project reports and technical agri-consultancy.", slug: "agri-consulting-dpr", href: "/services/agri-consulting-dpr" },
  
  // Sub-services for the "Agri Consulting" hub
  { icon: Beef, title: "Dairy Project Report", desc: "Bank-ready project report for dairy units.", slug: "dairy-project-report", href: "/services/dairy-project-report" },
  { icon: Egg, title: "Poultry Project Report", desc: "Bank-ready project report for poultry units.", slug: "poultry-project-report", href: "/services/poultry-project-report" },
  { icon: Landmark, title: "Crop Loans Support", desc: "Support for agricultural banking and crop loans.", slug: "crop-loans-support", href: "/services/crop-loans-support" },
  { icon: Droplets, title: "Sheep & Goat Project Report", desc: "Bank-ready project report for sheep/goat units.", slug: "sheep-goat-project-report", href: "/services/sheep-goat-project-report" },
];

export const courses = [];

export const consulting = [
  { icon: Egg, title: "Poultry Farming", img: "poultry", desc: "Layer & broiler unit setup, feed planning, biosecurity, profitability optimization." },
  { icon: Sprout, title: "Polyhouse Setup", img: "polyhouse", desc: "Design, structure selection, drip & fogger systems, high-value crop planning." },
  { icon: Beef, title: "Dairy Farming", img: "dairy", desc: "Breed selection, shed design, fodder management, milk yield improvement." },
  { icon: Droplets, title: "Hydroponics", img: "polyhouse", desc: "Soilless farming systems, NFT/DWC setup, nutrient management." },
  { icon: Rocket, title: "Agri Startup Consulting", img: "students", desc: "Business model, branding, go-to-market and investor readiness." },
  { icon: TrendingUp, title: "Investment Guidance", img: "dairy", desc: "ROI projections and risk mitigation for agriculture investments." },
];

export const metrics = [
  { value: 5000, label: "Students Trained" },
  { value: 720, label: "Successful Agri Projects" },
  { value: 10, label: "Years of Excellence", suffix: "+" },
];

export const testimonials = [
  { name: "Rahul Verma", role: "Agriculture Officer", text: "The structured coaching and practical mentorship helped me crack the AO exam in my first attempt." },
  { name: "Priya Sharma", role: "Polyhouse Entrepreneur", text: "From DPR to NABARD subsidy approval, their team handled everything perfectly." },
  { name: "Manoj Reddy", role: "Poultry Farm Owner", text: "Their poultry consulting transformed my small unit into a profitable scalable operation." },
];

export const faqs = [
  { q: "What coaching services do you provide?", a: "We provide coaching for practical exams, AO/AAO bank exams, and ICAR preparation." },
  { q: "Do you help with seat allocation?", a: "Yes, we provide full support for KCET and NRI quota seat allocation from start to finish." },
  { q: "Can you help with bank loans?", a: "Yes, we prepare bank-ready DPRs and assist with the entire loan and subsidy application process." },
];

export const blogs = [
  { slug: "best-agriculture-government-exams", title: "Best Agriculture Government Exams in India (2025 Guide)", excerpt: "A complete list of high-paying agriculture government exams, eligibility, and preparation roadmap.", date: "Mar 12, 2025", read: "8 min read" },
  { slug: "how-to-start-poultry-farming", title: "How to Start a Poultry Farm: Step-by-Step Investment Guide", excerpt: "Everything you need to launch a profitable poultry unit.", date: "Feb 28, 2025", read: "10 min read" },
];
