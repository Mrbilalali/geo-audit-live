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
      { href: "/keyword-suggest", label: "Keywords", ico: "🔑" },
      { href: "/traffic-overview", label: "Traffic", ico: "📈", pro: true },
      { href: "/entity-extractor", label: "Entities", ico: "🏷️", pro: true },
      { href: "/ngram-analyzer", label: "N-grams", ico: "🔤", pro: true },
      { href: "/heading-analyzer", label: "Headings", ico: "📑", pro: true },
      { href: "/readability", label: "Readability", ico: "📖" },
    ],
  },
  {
    label: "Search Data",
    items: [
      { href: "/gsc-analyzer", label: "GSC Analyzer", ico: "📊", pro: true },
      { href: "/backlink-analyzer", label: "Backlinks", ico: "🔗", pro: true },
    ],
  },
  {
    label: "Create & Optimize",
    items: [
      { href: "/content-optimizer", label: "Optimizer Pro", ico: "⚡", pro: true },
      { href: "/content-checker", label: "Content Checker", ico: "📝" },
      { href: "/brief-builder", label: "Brief Builder", ico: "📋", pro: true },
      { href: "/serp-preview", label: "SERP Preview", ico: "🔎" },
    ],
  },
  {
    label: "Technical",
    items: [
      { href: "/schema-generator", label: "Schema Kit", ico: "🧩", pro: true },
      { href: "/schema-validator", label: "Schema Check", ico: "✅", pro: true },
      { href: "/sitemap-tools", label: "Sitemaps", ico: "🗺️", pro: true },
      { href: "/bulk-meta", label: "Bulk Meta", ico: "📦", pro: true },
      { href: "/robots-validator", label: "robots.txt", ico: "🤖", pro: true },
      { href: "/prompt-kit", label: "Prompt Kit", ico: "💬", pro: true },
    ],
  },
  {
    label: "AI Studio",
    items: [
      { href: "/ai-command", label: "Command Center", ico: "🧠", pro: true },
      { href: "/ai-assistant", label: "AI Assistant", ico: "💭", pro: true },
      { href: "/ai-writer", label: "AI Writer", ico: "✍️", pro: true },
      { href: "/ai-images", label: "AI Images", ico: "🎨", pro: true },
      { href: "/wp-publisher", label: "WP Publisher", ico: "🚀", pro: true },
      { href: "/thumbnail-maker", label: "Thumbnails", ico: "🖼️", pro: true },
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
            <div className="pdesc">All 25 tools unlocked. Happy optimizing.</div>
          </>
        ) : (
          <>
            <div className="pname">Free plan</div>
            <div className="pdesc">5 of 25 tools · 3 audits/mo. Unlock everything for $9/mo.</div>
            <Link href="/pricing" className="btn">Go Pro →</Link>
          </>
        )}
      </div>
    </aside>
  );
}
