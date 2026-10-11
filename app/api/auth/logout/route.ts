import { clearSessionCookie } from "../../../../lib/session";

export const runtime = "nodejs";

// POST /api/auth/logout → clears the session cookie.
export async function POST() {
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": clearSessionCookie() } }
  );
}
