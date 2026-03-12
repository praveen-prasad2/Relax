import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { email, otp } = parsed.data;
    await connectDB();
    const record = await Otp.findOne({ email }).lean();
    if (!record) return NextResponse.json({ error: "OTP expired or invalid" }, { status: 400 });
    if (String(record.otp).trim() !== String(otp).trim()) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    if (new Date() > record.expiresAt) {
      await Otp.deleteOne({ email });
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }
    if (!record.username || !record.passwordHash) {
      return NextResponse.json({ error: "Invalid signup data" }, { status: 400 });
    }
    const existingUser = await User.findOne({ $or: [{ email: record.email }, { username: record.username }] });
    if (existingUser) {
      await Otp.deleteOne({ email });
      return NextResponse.json({ error: "Email or username already registered" }, { status: 400 });
    }
    await User.create({
      email: record.email,
      username: record.username,
      password: record.passwordHash,
      name: record.username,
    });
    await Otp.deleteOne({ email });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verify OTP error:", err);
    const isDuplicate = err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000;
    const msg = isDuplicate
      ? "Email or username already registered"
      : process.env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : "Account creation failed. Please try again.";
    return NextResponse.json({ error: msg }, { status: isDuplicate ? 400 : 500 });
  }
}
