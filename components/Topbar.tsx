"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getPlan } from "../lib/access";

const NAMES: Record<string, string> = {
  "/": "Dashboard",
  "/geo-audit": "Live Audit",
  "/content-optimizer": "Optimizer Pro",
  "/schema-generator": "Schema Kit",
  "/content-checker": "Content Checker",
  "/prompt-kit": "Prompt Kit",
  "/robots-validator": "robots.txt Validator",
  "/serp-preview": "SERP Preview",
  "/heading-analyzer": "Heading Analyzer",
  "/readability": "Readability",
  "/pricing": "Pricing",
  "/settings": "Settings",
};

const MOBILE_LINKS = ["/", "/geo-audit", "/content-optimizer", "/pricing", "/settings"];

export default function Topbar() {
  const path = usePathname();
  const [plan, setPlan] = useState<"free" | "pro">("free");

  useEffect(() => {
    setPlan(getPlan());
  }, [path]);

  const name = NAMES[path] || "GEO Toolkit";

  return (
    <>
      {/* desktop topbar */}
      <header className="deskbar">
        <div className="crumbs">
          <Link href="/">GEO Toolkit</Link>
          <span>›</span>
          <b>{name}</b>
        </div>
        <div className="barright">
          <span className={"planpill " + plan}>
            {plan === "pro" ? "⚡ Pro" : "Free plan"}
          </span>
          {plan === "free" && (
            <Link href="/pricing" className="btn" style={{ padding: "9px 20px", fontSize: 13.5, textDecoration: "none" }}>
              Upgrade →
            </Link>
          )}
        </div>
      </header>

      {/* mobile topbar */}
      <header className="topbar">
        <Link href="/" className="brandrow">
          <span className="brandlogo">🌊</span>
          <span className="brandname">
            GEO Toolkit<small>SEO · GEO · AI Search</small>
          </span>
        </Link>
        <nav className="topnavscroll">
          {MOBILE_LINKS.map((h) => (
            <Link key={h} href={h} className={"sidelink" + (path === h ? " on" : "")}>
              {NAMES[h]}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
