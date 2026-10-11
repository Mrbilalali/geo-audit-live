import { NextRequest } from "next/server";
import { verifyLicenseKey } from "../../../lib/license";

export const runtime = "nodejs";

// Legacy license-check endpoint (used by older clients). New code should use
// /api/auth/login which also mints a signed session cookie.
export async function POST(req: NextRequest) {
  let key = "";
  try {
    const body = await req.json();
    key = (body.key || "").trim();
  } catch {
    /* noop */
  }
  const v = await verifyLicenseKey(key);
  if (!v.valid) return Response.json({ valid: false });
  return Response.json({ valid: true, plan: v.plan });
}
