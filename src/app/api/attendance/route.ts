import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import {
  generateMonthDateKeys,
  parseDateKeyToDate,
  toDateKey,
  getDayName,
  isSunday,
  calculateWorkingMinutes,
  calculateDifferenceMinutes,
  buildAttendanceRows,
  detectHalfDay,
  ensurePunchOutAfterIn,
} from "@/lib/attendance-calculator";
import { z } from "zod";

const upsertSchema = z.object({
  date: z.string(),
  punchIn: z.union([z.string(), z.null()]).optional(),
  punchOut: z.union([z.string(), z.null()]).optional(),
  isLeave: z.enum(["None", "Leave", "WFH"]).optional(),
  isHoliday: z.boolean().optional(),
});

function parsePunch(iso: string | null | undefined): Date | null {
  if (iso == null || iso === "") return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

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
  const dateKeys = generateMonthDateKeys(year, month);
  const keySet = new Set(dateKeys);
  const rangeStart = new Date(parseDateKeyToDate(dateKeys[0]).getTime() - 86400000);
  const rangeEnd = new Date(parseDateKeyToDate(dateKeys[dateKeys.length - 1]).getTime() + 86400000 * 2);
  const raw = await Attendance.find({
    userId: user._id,
    date: { $gte: rangeStart, $lte: rangeEnd },
  }).lean();
  const recordByKey = new Map<string, (typeof raw)[0]>();
  for (const r of raw) {
    const key = toDateKey(new Date(r.date));
    if (keySet.has(key)) recordByKey.set(key, r);
  }
  const todayParam = searchParams.get("today");
  const todayStr =
    todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam) ? todayParam : toDateKey(new Date());
  const rows = buildAttendanceRows(dateKeys, recordByKey, todayStr);
  return NextResponse.json(
    { rows },
    { headers: { "Cache-Control": "private, no-store, must-revalidate" } }
  );
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
  const date = parseDateKeyToDate(parsed.data.date);
  const dayName = getDayName(date);
  const existing = await Attendance.findOne({ userId: user._id, date }).lean();

  const punchIn: Date | null =
    parsed.data.punchIn !== undefined
      ? parsePunch(parsed.data.punchIn)
      : existing?.punchIn
        ? new Date(existing.punchIn as string | Date)
        : null;
  let punchOut: Date | null =
    parsed.data.punchOut !== undefined
      ? parsePunch(parsed.data.punchOut)
      : existing?.punchOut
        ? new Date(existing.punchOut as string | Date)
        : null;
  punchOut = ensurePunchOutAfterIn(punchIn, punchOut);

  const leave =
    parsed.data.isLeave !== undefined ? parsed.data.isLeave : (existing?.isLeave ?? "None");
  const holiday =
    parsed.data.isHoliday !== undefined
      ? parsed.data.isHoliday
      : (existing?.isHoliday ?? isSunday(date));

  const workingMinutes =
    holiday || leave === "Leave" || leave === "WFH"
      ? 0
      : calculateWorkingMinutes(punchIn, punchOut);
  const isHalfDay = detectHalfDay(punchIn, punchOut, holiday, leave);
  const differenceMinutes = calculateDifferenceMinutes(workingMinutes, holiday, leave, isHalfDay);
  const record = await Attendance.findOneAndUpdate(
    { userId: user._id, date },
    {
      dayName,
      punchIn,
      punchOut,
      isLeave: leave,
      isHoliday: holiday,
      workingMinutes,
      differenceMinutes,
    },
    { upsert: true, new: true }
  );
  return NextResponse.json(record);
}
