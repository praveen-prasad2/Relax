import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import {
  generateMonthDates,
  getDayName,
  isSunday,
  toDateKey,
  calculateWorkingMinutes,
  calculateDifferenceMinutes,
} from "@/lib/attendance-calculator";
import { z } from "zod";

const upsertSchema = z.object({
  date: z.string(),
  punchIn: z.string().optional().nullable(),
  punchOut: z.string().optional().nullable(),
  isLeave: z.enum(["None", "Leave", "WFH"]).optional(),
  isHoliday: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || "");
  const month = parseInt(searchParams.get("month") || "");
  if (isNaN(year) || isNaN(month)) return NextResponse.json({ error: "Invalid year/month" }, { status: 400 });
  const dates = generateMonthDates(year, month);
  const records = await Attendance.find({
    userId: user._id,
    date: { $in: dates },
  }).lean();
  const map = new Map(records.map((r) => [toDateKey(new Date(r.date)), r]));
  const todayParam = searchParams.get("today");
  const todayStr =
    todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam)
      ? todayParam
      : toDateKey(new Date());
  let runningDiff = 0;
  const rows = dates.map((date) => {
    const key = toDateKey(date);
    const existing = map.get(key);
    const dayName = getDayName(date);
    const holiday = existing?.isHoliday ?? isSunday(date);
    const punchIn = existing?.punchIn ? new Date(existing.punchIn) : null;
    const punchOut = existing?.punchOut ? new Date(existing.punchOut) : null;
    const workingMinutes =
      holiday || existing?.isLeave === "Leave" || existing?.isLeave === "WFH"
        ? 0
        : calculateWorkingMinutes(punchIn, punchOut);
    const diff = calculateDifferenceMinutes(
      workingMinutes,
      holiday,
      existing?.isLeave ?? "None"
    );
    const isTodayNoOut = key === todayStr && !punchOut;
    if (!isTodayNoOut) runningDiff += diff;
    return {
      _id: existing?._id,
      date: key,
      dayName,
      punchIn: punchIn?.toISOString() ?? null,
      punchOut: punchOut?.toISOString() ?? null,
      isLeave: existing?.isLeave ?? "None",
      isHoliday: holiday,
      workingMinutes,
      differenceMinutes: diff,
      totalDifferenceMinutes: runningDiff,
    };
  });
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const [y, m, d] = parsed.data.date.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = getDayName(date);
  const holiday = parsed.data.isHoliday ?? isSunday(date);
  const punchIn = parsed.data.punchIn ? new Date(parsed.data.punchIn) : null;
  const punchOut = parsed.data.punchOut ? new Date(parsed.data.punchOut) : null;
  const workingMinutes =
    holiday || parsed.data.isLeave === "Leave" || parsed.data.isLeave === "WFH"
      ? 0
      : calculateWorkingMinutes(punchIn, punchOut);
  const differenceMinutes = calculateDifferenceMinutes(
    workingMinutes,
    holiday,
    parsed.data.isLeave ?? "None"
  );
  const record = await Attendance.findOneAndUpdate(
    { userId: user._id, date },
    {
      dayName,
      punchIn: punchIn || undefined,
      punchOut: punchOut || undefined,
      isLeave: parsed.data.isLeave ?? "None",
      isHoliday: holiday,
      workingMinutes,
      differenceMinutes,
    },
    { upsert: true, new: true }
  );
  return NextResponse.json(record);
}
