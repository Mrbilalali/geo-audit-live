import { BILLING } from "./billing";

// TEMPORARY TEST KEY — REMOVE BEFORE GO-LIVE (real keys come from Gumroad)
export const TEST_KEY = "GEO-PRO-TEST-BILAL-2026";

async function verifyWithGumroad(permalink: string, key: string): Promise<boolean> {
  // Placeholder permalinks are not real products yet — skip live checks for them.
  if (!permalink || permalink.includes("placeholder")) return false;
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

export async function verifyLicenseKey(key: string): Promise<{ valid: boolean; plan?: "monthly" | "lifetime" }> {
  const k = (key || "").trim();
  if (!k) return { valid: false };
  if (k === TEST_KEY) return { valid: true, plan: "lifetime" };
  if (await verifyWithGumroad(BILLING.lifetimePermalink, k)) return { valid: true, plan: "lifetime" };
  if (await verifyWithGumroad(BILLING.monthlyPermalink, k)) return { valid: true, plan: "monthly" };
  return { valid: false };
}
