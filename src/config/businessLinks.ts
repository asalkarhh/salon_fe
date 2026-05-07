export const BUSINESS_SITE_URL = "https://www.asalkar.in";

export const BUSINESS_QUICK_LINKS = [
  { label: "Home", href: `${BUSINESS_SITE_URL}/home` },
  { label: "About", href: `${BUSINESS_SITE_URL}/about` },
  { label: "Services", href: `${BUSINESS_SITE_URL}/services` },
  { label: "Projects", href: `${BUSINESS_SITE_URL}/projects` },
  { label: "Contact", href: `${BUSINESS_SITE_URL}/contact` },
] as const;

export const BUSINESS_LEGAL_LINKS = [
  { label: "Privacy Policy", href: `${BUSINESS_SITE_URL}/privacy` },
  { label: "Terms of Service", href: `${BUSINESS_SITE_URL}/terms` },
  { label: "Cookie Policy", href: `${BUSINESS_SITE_URL}/cookies` },
] as const;

export const BUSINESS_SERVICE_LINKS = [
  "Website Development",
  "E-Commerce Solutions",
  "SEO Optimization",
  "Google Business & Maps",
  "Mobile App Development",
  "UI/UX Design",
] as const;

export const BUSINESS_SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/asalkartechworks?igsh=NmFuNXgxaW4yemZk",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1CQUtKgJDj/",
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/918087818729",
  },
] as const;

export const BUSINESS_CONTACT = {
  phoneDisplay: "+91 8087818729",
  phoneHref: "tel:+918087818729",
  email: "asalkarhh@gmail.com",
} as const;
