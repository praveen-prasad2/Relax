import { NextRequest, NextResponse } from "next/server";
import { getAuthEmail } from "@/lib/auth-email";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import {
  toDateKey,
  parseDateKeyToDate,
  getAttendanceMonthFromDate,
  generateMonthDateKeys,
  buildAttendanceRows,
} from "@/lib/attendance-calculator";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const user = await User.findOne({ email }).select("_id").lean();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const dateParam = req.nextUrl.searchParams.get("date");
  let today: Date;
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    today = parseDateKeyToDate(dateParam);
  } else {
    today = new Date();
  }
  const todayStr = toDateKey(today);
  const { year, month } = getAttendanceMonthFromDate(today);
  const dateKeys = generateMonthDateKeys(year, month);
  const keySet = new Set(dateKeys);
  const rangeStart = new Date(parseDateKeyToDate(dateKeys[0]).getTime() - 86400000);
  const rangeEnd = new Date(parseDateKeyToDate(dateKeys[dateKeys.length - 1]).getTime() + 86400000 * 2);
  const raw = await Attendance.find({
    userId: user._id,
    date: { $gte: rangeStart, $lte: rangeEnd },
  })
    .select("date punchIn punchOut isLeave isHoliday workingMinutes differenceMinutes")
    .lean();
  const recordByKey = new Map<string, (typeof raw)[0]>();
  for (const r of raw) {
    const key = toDateKey(new Date(r.date));
    if (keySet.has(key)) recordByKey.set(key, r);
  }
  const rows = buildAttendanceRows(dateKeys, recordByKey, todayStr);
  const todayRow = rows.find((r) => r.date === todayStr);
  return NextResponse.json(
    {
      today: todayRow
        ? {
            punchIn: todayRow.punchIn,
            punchOut: todayRow.punchOut,
            punchInDisplay: todayRow.punchInDisplay,
            punchOutDisplay: todayRow.punchOutDisplay,
            workingMinutes: todayRow.workingMinutes,
            differenceMinutes: todayRow.differenceMinutes,
            isLeave: todayRow.isLeave,
            isHoliday: todayRow.isHoliday,
            isHalfDay: todayRow.isHalfDay,
          }
        : null,
      monthlyDifferenceMinutes: todayRow?.totalDifferenceMinutes ?? 0,
    },
    { headers: { "Cache-Control": "private, no-store, must-revalidate" } }
  );
}
