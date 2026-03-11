import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import { getAttendanceMonthFromDate, getAttendanceMonthBounds } from "@/lib/attendance-calculator";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const record = await Attendance.findOne({ userId: user._id, date: today }).lean();
  const { year, month } = getAttendanceMonthFromDate(today);
  const { start, end } = getAttendanceMonthBounds(year, month);
  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);
  const totals = await Attendance.aggregate([
    {
      $match: {
        userId: user._id,
        date: { $gte: start, $lte: endOfDay },
      },
    },
    { $group: { _id: null, sum: { $sum: "$differenceMinutes" } } },
  ]);
  const monthlyDiff = totals[0]?.sum ?? 0;
  return NextResponse.json({
    today: record
      ? {
          punchIn: record.punchIn,
          punchOut: record.punchOut,
          workingMinutes: record.workingMinutes,
          differenceMinutes: record.differenceMinutes,
          isLeave: record.isLeave,
          isHoliday: record.isHoliday,
        }
      : null,
    monthlyDifferenceMinutes: monthlyDiff,
  });
}
