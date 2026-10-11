# GEO Toolkit

A working **SEO/GEO SaaS-style tool suite** — 8 tools, every one does real work. Built with Next.js 15.

## Tools

1. **GEO Live Audit** (`/geo-audit`) — enter any URL; the server fetches robots.txt, llms.txt, sitemap.xml and homepage HTML **live**, then runs 15 weighted checks with evidence per finding. API: `/api/audit?url=`. Audit history is saved per-device (localStorage) and shown on the dashboard.
2. **Schema & Meta Kit** (`/schema-generator`) — business details in; copy-paste Organization + FAQ JSON-LD, AI-friendly robots.txt block, and llms.txt template out.
3. **Content GEO Checker** (`/content-checker`) — paste page text/HTML; answer-first analysis (direct-answer opening, depth, question coverage, quotable numbers, sentence length) with a 0–100 score.
4. **AI Prompt Tracker Kit** (`/prompt-kit`) — generates 30 tailored customer prompts + a printable monthly tracking sheet for ChatGPT / Perplexity / Gemini mentions.
5. **robots.txt AI-Bot Validator** (`/robots-validator`) — paste robots.txt (or fetch live); per-bot allow/block verdicts for GPTBot, PerplexityBot, ClaudeBot, Google-Extended, CCBot.
6. **SERP Preview** (`/serp-preview`) — Google snippet preview (desktop + mobile) with title/description length and keyword-consistency checks.
7. **Heading Analyzer** (`/heading-analyzer`) — paste HTML; full H1–H6 outline with hierarchy issue detection (multiple H1s, skipped levels, empty/long headings).
8. **Readability & Keywords** (`/readability`) — Flesch reading ease, grade level, top keywords, sentence stats.

## Deploy

`vdeploy deploy geo-audit-live .` (uses the `vercel` skill) or import `Mrbilalali/geo-audit-live` in the Vercel dashboard.
