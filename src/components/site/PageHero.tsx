import { ReactNode } from "react";

export function PageHero({ eyebrow, title, description, children, size = "md" }: { eyebrow?: string; title: ReactNode; description?: ReactNode; children?: ReactNode; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "py-6 md:py-8",
    md: "py-20 md:py-28",
    lg: "py-32 md:py-40"
  };

  return (
    <section className={`relative overflow-hidden bg-primary text-primary-foreground ${sizeClasses[size]}`}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, oklch(0.85 0.15 80 / 0.4), transparent 50%), radial-gradient(circle at 80% 80%, oklch(0.65 0.18 145 / 0.5), transparent 50%)" }} />
      <div className="relative container-px mx-auto max-w-5xl text-center">
        {eyebrow && (
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" /> {eyebrow}
          </span>
        )}
        <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">{title}</h1>
        {description && <p className="mt-5 text-lg text-primary-foreground/85 max-w-2xl mx-auto">{description}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
