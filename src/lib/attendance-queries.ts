import type { Types } from "mongoose";
import Attendance from "@/models/Attendance";
import { parseDateKeyToDate, toDateKey } from "@/lib/attendance-calculator";

export type LeanAttendanceDoc = {
  _id?: unknown;
  date?: Date | string;
  punchIn?: Date | string | null;
  punchOut?: Date | string | null;
  isLeave?: string;
  isHoliday?: boolean;
  workingMinutes?: number;
  differenceMinutes?: number;
  updatedAt?: Date | string;
};

function pickLeave(a?: string, b?: string): string {
  if (a && a !== "None") return a;
  if (b && b !== "None") return b;
  return a ?? b ?? "None";
}

function ts(u?: Date | string): number {
  if (!u) return 0;
  const t = new Date(u).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** When two Mongo rows map to the same IST calendar day (different `date` instants), merge without losing punches. */
export function mergeAttendanceLean(a: LeanAttendanceDoc, b: LeanAttendanceDoc): LeanAttendanceDoc {
  const [primary, secondary] = ts(b.updatedAt) >= ts(a.updatedAt) ? [b, a] : [a, b];
  return {
    ...primary,
    punchIn: primary.punchIn ?? secondary.punchIn,
    punchOut: primary.punchOut ?? secondary.punchOut,
    isLeave: pickLeave(primary.isLeave, secondary.isLeave),
    isHoliday: primary.isHoliday ?? secondary.isHoliday,
  };
}

/** Bucket raw attendance docs by IST date key; merge duplicates so UI + POST target the same logical day. */
export function indexAttendanceByIstDateKey(
  raw: LeanAttendanceDoc[],
  keySet: Set<string>
): Map<string, LeanAttendanceDoc> {
  const recordByKey = new Map<string, LeanAttendanceDoc>();
  for (const r of raw) {
    const key = toDateKey(new Date(r.date as string | Date));
    if (!keySet.has(key)) continue;
    const prev = recordByKey.get(key);
    if (!prev) recordByKey.set(key, r);
    else recordByKey.set(key, mergeAttendanceLean(prev, r));
  }
  return recordByKey;
}

const PADDING_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Find the canonical attendance row for an IST calendar day. Uses a wide UTC window then filters by
 * `toDateKey(r.date) === dateKey` so legacy `date` values still match.
 */
export async function findExistingAttendanceForDateKey(
  userId: Types.ObjectId,
  dateKey: string
): Promise<LeanAttendanceDoc | null> {
  const dayStart = parseDateKeyToDate(dateKey);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const wideStart = new Date(dayStart.getTime() - PADDING_MS);
  const wideEnd = new Date(dayEnd.getTime() + PADDING_MS);

  const candidates = await Attendance.find({
    userId,
    date: { $gte: wideStart, $lte: wideEnd },
  })
    .sort({ updatedAt: -1 })
    .lean();

  const matching = candidates.filter((r) => toDateKey(new Date(r.date as string | Date)) === dateKey);
  if (matching.length > 1) {
    console.log("[attendance-queries] duplicate Mongo rows for same IST day", {
      dateKey,
      count: matching.length,
      ids: matching.map((m) => String(m._id)),
    });
  }
  return matching[0] ?? null;
}

/** After a successful save, remove other Mongo docs for the same IST day so GET/POST stay consistent. */
export async function deleteDuplicateAttendanceForIstDay(
  userId: Types.ObjectId,
  dateKey: string,
  keepId: unknown
): Promise<number> {
  const dayStart = parseDateKeyToDate(dateKey);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const wideStart = new Date(dayStart.getTime() - PADDING_MS);
  const wideEnd = new Date(dayEnd.getTime() + PADDING_MS);

  const candidates = await Attendance.find({
    userId,
    date: { $gte: wideStart, $lte: wideEnd },
  }).lean();

  const dupes = candidates.filter(
    (r) =>
      String(r._id) !== String(keepId) && toDateKey(new Date(r.date as string | Date)) === dateKey
  );
  if (dupes.length === 0) return 0;
  const result = await Attendance.deleteMany({ _id: { $in: dupes.map((d) => d._id) } });
  console.log("[attendance-queries] deleted duplicate IST-day rows", {
    dateKey,
    deleted: result.deletedCount,
  });
  return result.deletedCount;
}
