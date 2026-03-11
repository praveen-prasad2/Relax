import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { sendOtp } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { email, username, password } = parsed.data;
    await connectDB();
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    const existingUsername = await User.findOne({ username });
    if (existingUsername) return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const passwordHash = await bcrypt.hash(password, 10);
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp, expiresAt, username, passwordHash });
    await sendOtp(email, otp);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Send OTP error:", err);
    const msg = process.env.NODE_ENV === "development" && err instanceof Error ? err.message : "Failed to send OTP. Check SMTP config.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
