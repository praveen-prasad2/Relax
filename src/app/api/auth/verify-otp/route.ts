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
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { email, otp } = parsed.data;
    await connectDB();
    const record = await Otp.findOne({ email });
    if (!record) return NextResponse.json({ error: "OTP expired or invalid" }, { status: 400 });
    if (record.otp !== otp) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    if (new Date() > record.expiresAt) {
      await Otp.deleteOne({ email });
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }
    if (!record.username || !record.passwordHash) {
      return NextResponse.json({ error: "Invalid signup data" }, { status: 400 });
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
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" && err instanceof Error ? err.message : "Verification failed" },
      { status: 500 }
    );
  }
}
