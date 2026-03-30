import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

/**
 * Resolves the signed-in user's email in Route Handlers.
 * Uses JWT from the `Cookie` header (reliable on Vercel). Falls back to DB lookup by `sub` if email is missing from older tokens.
 */
export async function getAuthEmail(req: NextRequest): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    const cookie = req.headers.get("cookie") ?? "";
    const token = await getToken({
      req: { headers: { cookie } } as any,
      secret,
    });
    const email = token?.email;
    if (typeof email === "string" && email.length > 0) return email;
    const sub = token?.sub;
    if (typeof sub === "string" && sub.length > 0) {
      await connectDB();
      const u = await User.findById(sub).select("email").lean();
      if (u?.email) return u.email;
    }
  }
  const session = await getServerSession(authOptions);
  return session?.user?.email ?? null;
}
