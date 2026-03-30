import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { logApi } from "@/lib/server-debug";

const TAG = "auth-email";
const dbg = () => process.env.ATTENDANCE_DEBUG === "1";

function looksLikeObjectId(s: string): boolean {
  return /^[a-f\d]{24}$/i.test(s);
}

async function resolveEmailFromSub(sub: string): Promise<string | null> {
  await connectDB();
  if (looksLikeObjectId(sub)) {
    const byId = await User.findById(sub).select("email").lean();
    if (byId?.email) {
      if (dbg()) logApi(TAG, "resolved email via User.findById(sub)", { sub: `${sub.slice(0, 8)}…` });
      return byId.email;
    }
    if (dbg()) logApi(TAG, "findById(sub) no user", { sub: `${sub.slice(0, 8)}…` });
  }
  if (sub.includes("@")) {
    const byEmail = await User.findOne({ email: sub }).select("email").lean();
    if (byEmail?.email) {
      if (dbg()) logApi(TAG, "resolved email: sub matched as email");
      return byEmail.email;
    }
  }
  return null;
}

/**
 * Resolves the signed-in user's email in Route Handlers.
 * Uses JWT from the `Cookie` header. `sub` may be ObjectId or email (NextAuth + credentials).
 */
export async function getAuthEmail(req: NextRequest): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    logApi(TAG, "NEXTAUTH_SECRET missing — JWT verify will fail");
  } else {
    const cookie = req.headers.get("cookie") ?? "";
    if (dbg()) logApi(TAG, "cookie", { length: cookie.length, hasSessionToken: /session-token/i.test(cookie) });
    const token = await getToken({
      req: { headers: { cookie } } as any,
      secret,
    });
    if (!token) {
      logApi(TAG, "getToken returned null — check NEXTAUTH_SECRET, cookie, expiry");
    } else if (dbg()) {
      logApi(TAG, "jwt decoded", { hasEmail: !!token.email, hasSub: !!token.sub });
    }
    const email = token?.email;
    if (typeof email === "string" && email.length > 0) return email;
    const sub = token?.sub;
    if (typeof sub === "string" && sub.length > 0) {
      const resolved = await resolveEmailFromSub(sub);
      if (resolved) return resolved;
      logApi(TAG, "could not resolve email from sub", { subLen: sub.length, looksOid: looksLikeObjectId(sub) });
    }
  }
  const session = await getServerSession(authOptions);
  const fromSession = session?.user?.email ?? null;
  if (fromSession) {
    if (dbg()) logApi(TAG, "fallback getServerSession ok");
    return fromSession;
  }
  logApi(TAG, "no email — auth failed all paths");
  return null;
}
