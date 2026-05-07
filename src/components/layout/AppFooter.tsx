import type { ReactNode, SVGProps } from "react";
import { ArrowUpRight, Mail, Phone, ShieldCheck } from "lucide-react";
import { BusinessLogo } from "@/components/layout/BusinessLogo";
import {
  BUSINESS_CONTACT,
  BUSINESS_LEGAL_LINKS,
  BUSINESS_QUICK_LINKS,
  BUSINESS_SERVICE_LINKS,
  BUSINESS_SITE_URL,
  BUSINESS_SOCIAL_LINKS,
} from "@/config/businessLinks";

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M14.5 8.25h2V4.75h-2.35c-3.08 0-4.65 1.84-4.65 4.73V12H7v3.25h2.5v4.5H13v-4.5h2.9L16.35 12H13V9.8c0-0.93 0.43-1.55 1.5-1.55Z" />
    </svg>
  );
}

function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M20 11.78c0 4.43-3.6 8.02-8.04 8.02-1.4 0-2.71-.35-3.86-.98L4 20l1.23-4.01a7.95 7.95 0 0 1-1.27-4.21c0-4.43 3.6-8.03 8.04-8.03 4.45 0 8.05 3.6 8.05 8.03Z" />
      <path d="M9.03 8.77c0.14-0.3 0.28-0.31 0.53-0.32 0.16 0 0.35 0 0.53 0.01 0.18 0.01 0.43-0.07 0.67 0.52 0.24 0.59 0.82 2.02 0.89 2.16 0.07 0.14 0.12 0.31 0.03 0.49-0.09 0.18-0.14 0.29-0.28 0.45-0.14 0.16-0.29 0.36-0.42 0.48-0.14 0.13-0.29 0.28-0.12 0.56 0.17 0.28 0.77 1.26 1.65 2.05 1.13 1.01 2.08 1.33 2.37 1.48 0.29 0.15 0.46 0.13 0.63-0.08 0.17-0.21 0.73-0.85 0.92-1.14 0.19-0.29 0.39-0.24 0.66-0.14 0.27 0.1 1.72 0.81 2.01 0.96 0.29 0.14 0.49 0.21 0.56 0.33 0.07 0.12 0.07 0.71-0.17 1.4-0.24 0.69-1.41 1.34-1.96 1.42-0.55 0.08-1.25 0.12-2.02-0.13-0.47-0.15-1.08-0.35-1.87-0.69-3.29-1.42-5.44-4.76-5.61-5-0.17-0.24-1.34-1.78-1.34-3.4 0-1.62 0.84-2.41 1.14-2.74Z" />
    </svg>
  );
}

function FooterLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`group inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary ${className}`}
    >
      <span>{children}</span>
      <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </a>
  );
}

function FooterHeading({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
      {children}
    </p>
  );
}

export function AppFooter() {
  return (
    <footer className="mt-8 border-t border-primary/10 bg-[linear-gradient(180deg,rgba(255,250,247,0.96),rgba(248,241,237,0.98))]">
      <div className="pointer-events-none h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-x-10 gap-y-8 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5 pr-0 xl:pr-8">
            <BusinessLogo className="items-start" />
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Trusted digital partner behind this salon SaaS platform, with the same
              polished detail and business-first approach reflected across the product.
            </p>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <a
                href={BUSINESS_CONTACT.phoneHref}
                className="inline-flex items-center gap-2 transition hover:text-primary"
              >
                <Phone className="h-4 w-4 text-primary" />
                {BUSINESS_CONTACT.phoneDisplay}
              </a>
              <a
                href={`mailto:${BUSINESS_CONTACT.email}`}
                className="inline-flex items-center gap-2 transition hover:text-primary"
              >
                <Mail className="h-4 w-4 text-primary" />
                {BUSINESS_CONTACT.email}
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <FooterHeading>Quick Links</FooterHeading>
            <div className="space-y-3">
              {BUSINESS_QUICK_LINKS.map((link) => (
                <div key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <FooterHeading>Services</FooterHeading>
            <div className="space-y-3">
              {BUSINESS_SERVICE_LINKS.map((service) => (
                <div key={service}>
                  <FooterLink href={`${BUSINESS_SITE_URL}/services`}>{service}</FooterLink>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <FooterHeading>Policies</FooterHeading>
              <div className="space-y-3">
                {BUSINESS_LEGAL_LINKS.map((link) => (
                  <div key={link.href}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <FooterHeading>Connect</FooterHeading>
              <div className="flex flex-wrap gap-3">
                {BUSINESS_SOCIAL_LINKS.map((link) => {
                  const Icon =
                    link.label === "Instagram"
                      ? InstagramIcon
                      : link.label === "Facebook"
                        ? FacebookIcon
                        : WhatsAppIcon;

                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={link.label}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-white/70 text-muted-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-border/70 pt-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl">
            Copyright {new Date().getFullYear()} Asalkar TechWork. Design, build, and
            digital growth crafted for modern businesses.
          </p>
          <a
            href={BUSINESS_SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 self-start rounded-full border border-border/80 bg-white/75 px-4 py-2 font-medium text-foreground shadow-sm transition hover:border-primary/30 hover:text-primary md:self-auto"
          >
            <ShieldCheck className="h-4 w-4" />
            Visit Asalkar TechWork
          </a>
        </div>
      </div>
    </footer>
  );
}
