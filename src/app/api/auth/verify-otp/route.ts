import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  otp: z
    .union([z.string(), z.number()])
    .transform((v) => String(v).replace(/\D/g, "").slice(0, 6))
    .refine((s) => s.length === 6, "OTP must be 6 digits"),
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
      const msg = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { email, otp } = parsed.data;
    const emailLower = email.toLowerCase().trim();
    await connectDB();
    const record = await Otp.findOne({ email: emailLower }).lean();
    if (!record) return NextResponse.json({ error: "OTP expired or invalid" }, { status: 400 });
    if (String(record.otp).trim() !== String(otp).trim()) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    if (new Date() > record.expiresAt) {
      await Otp.deleteOne({ email: emailLower });
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }
    if (!record.username || !record.passwordHash) {
      return NextResponse.json({ error: "Invalid signup data" }, { status: 400 });
    }
    const usernameTrim = String(record.username).trim();
    const existingByEmail = await User.findOne({ email: emailLower }).lean();
    const existingByUsername = await User.findOne({ username: usernameTrim }).lean();
    if (existingByEmail) {
      await Otp.deleteOne({ email: emailLower });
      return NextResponse.json({ error: "This email is already registered" }, { status: 400 });
    }
    if (existingByUsername) {
      await Otp.deleteOne({ email: emailLower });
      return NextResponse.json({ error: "This username is already taken" }, { status: 400 });
    }
    // User created only after successful OTP verification — all user data stored in MongoDB
    await User.create({
      email: emailLower,
      username: usernameTrim,
      password: record.passwordHash,
      name: usernameTrim,
    });
    await Otp.deleteOne({ email: emailLower });
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
