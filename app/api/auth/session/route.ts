import { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "../../../../lib/session";

export const runtime = "nodejs";

// GET /api/auth/session → { plan: "pro" | "free", tier?: "monthly" | "lifetime" }
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return Response.json({ plan: "free" });
  return Response.json({ plan: "pro", tier: s.plan });
}
