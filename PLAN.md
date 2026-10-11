# GEO Toolkit — SaaS Plan v1 (2026-10-11)

## Vision
All-in-one SEO/GEO toolkit, offered on **subscription** — same model as SemanticsX:
user subscribes → gets a license key → unlocks all tools. Data-powered tools run on
**BYO API keys** (user pastes their own DataForSEO / OpenAI / Places keys in Settings;
keys never leave their browser).

## Tool suite (100% SEO/GEO, every tool does real work)

**Built (v3, live):**
1. GEO Live Audit — URL in, 15 live server-side checks, 0–100 score + evidence
2. Content Optimizer Pro — 20-rule semantic scoring engine (flagship)
3. Schema & Meta Kit — JSON-LD, robots.txt, llms.txt generators
4. Content GEO Checker — answer-first analysis of pasted text
5. AI Prompt Tracker Kit — 30 tailored prompts + monthly tracking sheet
6. robots.txt AI-Bot Validator — per-bot allow/block verdicts
7. SERP Preview — Google snippet preview + length/keyword checks
8. Heading Analyzer — H1–H6 outline + hierarchy issues
9. Readability & Keywords — Flesch score, grade level, top keywords
10. Settings — BYO API key storage (localStorage only)

**Next (no API needed):**
- NLP pack: Entities extractor + N-grams extractor
- Schema validator (paste HTML → validate JSON-LD)
- Content brief builder (topic in → outline + questions + entities out)

**Later (needs BYO keys from Settings):**
- Keyword Suggest (DataForSEO autocomplete)
- SERP Checker (DataForSEO, location-aware)
- AI content features (user's OpenAI key)

**Out of scope (honest):** live backlink databases, rank-tracker grids, GSC
integrations, desktop crawler, Chrome extension, 48 custom GPTs, course LMS —
these need paid data pipelines / native apps / content teams.

## Subscription design

- **Provider:** Gumroad (account + payouts already working). Subscription product
  → buyer gets a license key.
- **App side:** `/api/license` verifies the key server-side via Gumroad's license
  API; key stored in browser; a paywall component gates the tool pages.
- **Tiers (proposal):**
  - Free: Live Audit 3 scans/month, Content Checker 3/month, SERP Preview unlimited;
    everything else locked.
  - Pro: everything unlimited. Price: TBD by owner.
- **Owner actions needed:** create the Gumroad subscription product, share its
  permalink/product ID; confirm monthly price; confirm free-tier limits.

## Phases

1. **v3 deploy** — Content Optimizer Pro + Settings (today)
2. **Paywall** — license verification + pricing page + gating (needs owner pricing + Gumroad product)
3. **NLP pack + brief builder** (no API needed)
4. **API-powered tools** — Keyword Suggest, SERP Checker (needs BYO keys live in Settings)

## Open decisions (owner)
- [ ] Monthly Pro price?
- [ ] Free-tier limits OK?
- [ ] Public site vs Vercel login wall? (currently login-walled)
