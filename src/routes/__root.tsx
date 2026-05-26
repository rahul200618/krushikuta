import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { Toaster } from "sonner";
import { ServicesPopup } from "@/components/site/ServicesPopup";
import faviconUrl from "../assets/favicon-v2.png?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try again.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Krishikuta-Agriculture coaching institute" },
      { name: "description", content: "Premier agriculture training institute offering government exam coaching, ICAR preparation, poultry & polyhouse consulting and NABARD project reports." },
      { name: "keywords", content: "Agriculture govt exam coaching, ICAR coaching institute, Agriculture practical exam training, Poultry farming consultancy, Polyhouse consulting, NABARD project reports, Farm science coaching" },
      { name: "author", content: "Krishikuta" },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Krishikuta-Agriculture coaching institute" },
      { property: "og:description", content: "Premier agriculture training institute offering government exam coaching, ICAR preparation, poultry & polyhouse consulting and NABARD project reports." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_IN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Krishikuta-Agriculture coaching institute" },
      { name: "twitter:description", content: "Premier agriculture training institute offering government exam coaching, ICAR preparation, poultry & polyhouse consulting and NABARD project reports." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a7d4fa3e-1cc3-448e-8770-d137067afb7f/id-preview-dd59f796--90da0220-10e7-48e4-b193-0c0555ee8ee1.lovable.app-1778573289295.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a7d4fa3e-1cc3-448e-8770-d137067afb7f/id-preview-dd59f796--90da0220-10e7-48e4-b193-0c0555ee8ee1.lovable.app-1778573289295.png" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: faviconUrl },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" },
      { rel: "canonical", href: "https://krishikuta.com/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          name: "Krishikuta",
          description: "Agriculture government exam coaching, ICAR training, agri-business consulting and bank loan project reports.",
          url: "https://krishikuta.com/",
          telephone: "+91-9108652322",
          email: "connect@krishikuta.in",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Agriculture Knowledge Park",
            addressLocality: "Hyderabad",
            addressCountry: "IN",
          },
          sameAs: [
            "https://www.instagram.com/krishikuta_official?igsh=MTd2dG9iMms1bW5ueg==",
            "https://youtube.com/@krishikuta?si=dGApyIrBTUpGlW6q"
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" expand={false} richColors />
      <Navbar />
      <main className="pt-16 md:pt-20">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
      <ServicesPopup />
    </QueryClientProvider>
  );
}
