import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEO Toolkit — Get Cited by ChatGPT, Perplexity & Google AI",
  description:
    "A working SEO/GEO tool suite: live AI-visibility audit, schema & meta code generator, content GEO checker, and AI prompt tracker. Built by Mr Bilal Ali.",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/geo-audit", label: "Live Audit" },
  { href: "/schema-generator", label: "Schema Kit" },
  { href: "/content-checker", label: "Content" },
  { href: "/prompt-kit", label: "Prompts" },
  { href: "/robots-validator", label: "robots.txt" },
  { href: "/serp-preview", label: "SERP" },
  { href: "/heading-analyzer", label: "Headings" },
  { href: "/readability", label: "Readability" },
  { href: "/pricing", label: "💎 Pricing" },
  { href: "/settings", label: "⚙ Settings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="topnav no-print">
          <div className="navinner">
            <Link href="/" className="brand">
              <span className="brandmark">◆</span> GEO Toolkit
            </Link>
            <div className="navlinks">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="navlink">
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
