import { NextRequest } from "next/server";
import { BILLING } from "../../../lib/billing";

export const runtime = "nodejs";

async function verifyWithGumroad(permalink: string, key: string): Promise<boolean> {
  try {
    const form = new URLSearchParams({ product_permalink: permalink, license_key: key });
    const r = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const d = await r.json();
    return d && d.success === true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let key = "";
  try {
    const body = await req.json();
    key = (body.key || "").trim();
  } catch {
    /* noop */
  }
  if (!key) return Response.json({ valid: false }, { status: 400 });

  // TEMPORARY TEST KEY — REMOVE BEFORE GO-LIVE (real keys come from Gumroad)
  if (key === "GEO-PRO-TEST-BILAL-2026") {
    return Response.json({ valid: true, plan: "lifetime" });
  }

  // Lifetime keys unlock everything, forever.
  if (await verifyWithGumroad(BILLING.lifetimePermalink, key)) {
    return Response.json({ valid: true, plan: "lifetime" });
  }
  // Monthly subscription keys unlock while the subscription is active.
  if (await verifyWithGumroad(BILLING.monthlyPermalink, key)) {
    return Response.json({ valid: true, plan: "monthly" });
  }
  return Response.json({ valid: false });
}
