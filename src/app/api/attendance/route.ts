import { NextRequest, NextResponse } from "next/server";
import { getAuthEmail } from "@/lib/auth-email";
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
import { logApi, logApiError } from "@/lib/server-debug";
import {
  indexAttendanceByIstDateKey,
  findExistingAttendanceForDateKey,
  deleteDuplicateAttendanceForIstDay,
} from "@/lib/attendance-queries";

const TAG = "attendance-api";

const upsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  punchIn: z.union([z.string(), z.null()]).optional(),
  punchOut: z.union([z.string(), z.null()]).optional(),
  isLeave: z.enum(["None", "Leave", "WFH"]).optional(),
  isHoliday: z.coerce.boolean().optional(),
});

export const runtime = "nodejs";

function parsePunch(iso: string | null | undefined): Date | null {
  if (iso == null || iso === "") return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isDuplicateKeyError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: number }).code === 11000;
}

export async function GET(req: NextRequest) {
  const email = await getAuthEmail(req);
  if (!email) {
    logApi(TAG, "GET 401 — no email from auth");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const user = await User.findOne({ email }).select("_id").lean();
  if (!user) {
    logApi(TAG, "GET 404 — user doc missing for email");
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
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
  })
    .select("date punchIn punchOut isLeave isHoliday workingMinutes differenceMinutes updatedAt")
    .lean();
  const recordByKey = indexAttendanceByIstDateKey(raw, keySet);
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
  const email = await getAuthEmail(req);
  if (!email) {
    logApi(TAG, "POST 401 — no email from auth");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (e) {
    logApiError(TAG, "POST body JSON parse failed", e);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    logApi(TAG, "POST 400 — zod validation", parsed.error.flatten());
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email }).select("_id").lean();
  if (!user) {
    logApi(TAG, "POST 404 — user doc missing");
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const dateKey = parsed.data.date;
  const dayStart = parseDateKeyToDate(dateKey);
  const dayName = getDayName(dayStart);

  const existing = await findExistingAttendanceForDateKey(user._id, dateKey);
  logApi(TAG, "POST merge", {
    dateKey,
    hasExisting: !!existing?._id,
    punchInSent: parsed.data.punchIn !== undefined,
    punchOutSent: parsed.data.punchOut !== undefined,
  });

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
      : (existing?.isHoliday ?? isSunday(dayStart));

  const workingMinutes =
    holiday || leave === "Leave" || leave === "WFH"
      ? 0
      : calculateWorkingMinutes(punchIn, punchOut);
  const isHalfDay = detectHalfDay(punchIn, punchOut, holiday, leave);
  const differenceMinutes = calculateDifferenceMinutes(workingMinutes, holiday, leave, isHalfDay);

  const doc = {
    dayName,
    date: dayStart,
    punchIn,
    punchOut,
    isLeave: leave,
    isHoliday: holiday,
    workingMinutes,
    differenceMinutes,
  };

  try {
    if (existing?._id) {
      const res = await Attendance.updateOne({ _id: existing._id }, { $set: doc });
      logApi(TAG, "updateOne result", { matched: res.matchedCount, modified: res.modifiedCount });
      if (res.matchedCount === 0) {
        logApiError(TAG, "updateOne matched 0 documents — _id mismatch?", existing._id);
        return NextResponse.json({ error: "Could not update attendance row" }, { status: 409 });
      }
      await deleteDuplicateAttendanceForIstDay(user._id, dateKey, existing._id);
      return NextResponse.json({ ok: true, id: String(existing._id), saved: true });
    }
    try {
      const created = await Attendance.create({ userId: user._id, ...doc });
      logApi(TAG, "create ok", { id: String(created._id) });
      await deleteDuplicateAttendanceForIstDay(user._id, dateKey, created._id);
      return NextResponse.json({ ok: true, id: String(created._id), saved: true });
    } catch (e) {
      if (!isDuplicateKeyError(e)) throw e;
      logApi(TAG, "create duplicate key — retrying find + update");
      const again = await findExistingAttendanceForDateKey(user._id, dateKey);
      if (!again?._id) throw e;
      await Attendance.updateOne({ _id: again._id }, { $set: { ...doc, date: dayStart } });
      logApi(TAG, "retry update ok", { id: String(again._id) });
      await deleteDuplicateAttendanceForIstDay(user._id, dateKey, again._id);
      return NextResponse.json({ ok: true, id: String(again._id), saved: true });
    }
  } catch (e) {
    logApiError(TAG, "POST save failed", e);
    const msg = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
