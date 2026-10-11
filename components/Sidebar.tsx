"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getPlan } from "../lib/access";

interface NavItem {
  href: string;
  label: string;
  ico: string;
  pro?: boolean;
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", ico: "🏠" }],
  },
  {
    label: "Analyze",
    items: [
      { href: "/geo-audit", label: "Live Audit", ico: "🔍" },
      { href: "/heading-analyzer", label: "Headings", ico: "📑", pro: true },
      { href: "/readability", label: "Readability", ico: "📖" },
    ],
  },
  {
    label: "Create & Optimize",
    items: [
      { href: "/content-optimizer", label: "Optimizer Pro", ico: "⚡", pro: true },
      { href: "/content-checker", label: "Content Checker", ico: "📝" },
      { href: "/serp-preview", label: "SERP Preview", ico: "🔎" },
    ],
  },
  {
    label: "Technical",
    items: [
      { href: "/schema-generator", label: "Schema Kit", ico: "🧩", pro: true },
      { href: "/robots-validator", label: "robots.txt", ico: "🤖", pro: true },
      { href: "/prompt-kit", label: "Prompt Kit", ico: "💬", pro: true },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/pricing", label: "Pricing", ico: "💎" },
      { href: "/settings", label: "Settings", ico: "⚙️" },
    ],
  },
];

export default function Sidebar() {
  const path = usePathname();
  const [plan, setPlan] = useState<"free" | "pro">("free");

  useEffect(() => {
    setPlan(getPlan());
  }, [path]);

  return (
    <aside className="sidebar">
      <Link href="/" className="brandrow">
        <span className="brandlogo">🌊</span>
        <span className="brandname">
          GEO Toolkit<small>SEO · GEO · AI Search</small>
        </span>
      </Link>

      <nav>
        {GROUPS.map((g) => (
          <div key={g.label}>
            <div className="navgroup">{g.label}</div>
            {g.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={"sidelink" + (path === it.href ? " on" : "")}
              >
                <span className="ico">{it.ico}</span>
                {it.label}
                {it.pro && plan === "free" && <span className="lock">🔒</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="plancard">
        {plan === "pro" ? (
          <>
            <div className="pname">⚡ Pro active</div>
            <div className="pdesc">All 9 tools unlocked. Happy optimizing.</div>
          </>
        ) : (
          <>
            <div className="pname">Free plan</div>
            <div className="pdesc">4 of 9 tools · 3 audits/mo. Unlock everything for $9/mo.</div>
            <Link href="/pricing" className="btn">Go Pro →</Link>
          </>
        )}
      </div>
    </aside>
  );
}
