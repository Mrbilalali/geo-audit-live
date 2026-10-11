import { NextRequest } from "next/server";
import { verifyLicenseKey } from "../../../../lib/license";
import { newSessionCookie } from "../../../../lib/session";

export const runtime = "nodejs";

// POST /api/auth/login { key } → verifies the license key, sets a signed
// httpOnly session cookie on success.
export async function POST(req: NextRequest) {
  let key = "";
  try {
    const body = await req.json();
    key = (body.key || "").trim();
  } catch {
    /* noop */
  }
  const v = await verifyLicenseKey(key);
  if (!v.valid || !v.plan) {
    return Response.json({ ok: false, error: "Invalid license key." }, { status: 401 });
  }
  return Response.json(
    { ok: true, plan: v.plan },
    { headers: { "Set-Cookie": newSessionCookie(key, v.plan) } }
  );
}
