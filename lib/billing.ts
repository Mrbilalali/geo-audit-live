// Central billing config. Product permalinks come from Gumroad once the
// subscription + lifetime products are created there. Override via env.
export const BILLING = {
  monthlyPermalink:
    process.env.NEXT_PUBLIC_GUMROAD_MONTHLY || "geo-toolkit-pro-monthly",
  lifetimePermalink:
    process.env.NEXT_PUBLIC_GUMROAD_LIFETIME || "geo-toolkit-lifetime",
  storeUrl: "https://mrbilalali.gumroad.com",
  monthlyPrice: 29,
  monthlyDeal: 9,
  lifetimePrice: 5000,
  lifetimeDeal: 100,
  lifetimeSeats: 100,
};

// Free tier: tools anyone can use without a key.
export const FREE_UNLIMITED = ["serp-preview", "readability"];
// Free tier: monthly caps (per tool).
export const FREE_MONTHLY_LIMIT: Record<string, number> = {
  "geo-audit": 3,
  "content-checker": 3,
};
// Every other tool id requires a Pro (license-key) plan.
