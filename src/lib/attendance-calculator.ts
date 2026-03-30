const REQUIRED_MINUTES_PER_DAY = 9 * 60;
/** IST: punch-in at or after 10:30 (minutes from midnight). */
const HALF_DAY_IN_FROM = 10 * 60 + 30;
/** IST: punch-out at or before 16:30 (minutes from midnight). */
const HALF_DAY_OUT_UNTIL = 16 * 60 + 30;

/** Calendar + attendance cycle use India timezone (matches typical deployment / users). */
export const ATTENDANCE_TZ = "Asia/Kolkata";

/** India Standard Time is fixed UTC+05:30 (no DST). Same result in Node, browsers, and Vercel. */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/**
 * IST calendar date + wall clock from a UTC instant (Mongo `Date`).
 * Avoids `toLocaleString`/`formatToParts` inconsistencies that can show UTC as local clock on some runtimes.
 */
function getISTDateTimeParts(date: Date): { dateKey: string; hour: number; minute: number } | null {
  if (Number.isNaN(date.getTime())) return null;
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const mo = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  return {
    dateKey: `${y}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    hour,
    minute,
  };
}

/** YYYY-MM-DD in ATTENDANCE_TZ (same logic everywhere: dev, Vercel, all browsers). */
export function toDateKey(date: Date): string {
  return getISTDateTimeParts(date)?.dateKey ?? "";
}

/** Start of that calendar day in IST as a UTC instant (stable in MongoDB). */
export function parseDateKeyToDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00+05:30`);
}

export function getAttendanceMonthBounds(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 2, 24));
  const end = new Date(Date.UTC(year, month - 1, 23));
  return { start, end };
}

export function getAttendanceMonthFromDate(date: Date): { year: number; month: number } {
  const key = toDateKey(date);
  const [y, m, d] = key.split("-").map(Number);
  if (d >= 24) {
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    return { year: nextY, month: nextM };
  }
  return { year: y, month: m };
}

export function generateMonthDateKeys(year: number, month: number): string[] {
  const { start, end } = getAttendanceMonthBounds(year, month);
  const keys: string[] = [];
  let cur = new Date(start.getTime());
  while (cur <= end) {
    keys.push(toDateKey(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return keys;
}

/** @deprecated Prefer generateMonthDateKeys + parseDateKeyToDate */
export function generateMonthDates(year: number, month: number): Date[] {
  return generateMonthDateKeys(year, month).map((k) => parseDateKeyToDate(k));
}

export function getDayName(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: ATTENDANCE_TZ, weekday: "long" }).format(date);
}

export function isSunday(date: Date): boolean {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone: ATTENDANCE_TZ, weekday: "short" }).format(date) === "Sun"
  );
}

export function calculateWorkingMinutes(punchIn: Date | null, punchOut: Date | null): number {
  if (!punchIn || !punchOut) return 0;
  return Math.max(0, Math.floor((punchOut.getTime() - punchIn.getTime()) / 60000));
}

/** Minutes from midnight in ATTENDANCE_TZ. */
export function getMinutesSinceMidnightIST(date: Date): number {
  const p = getISTDateTimeParts(date);
  if (!p) return 0;
  return p.hour * 60 + p.minute;
}

/**
 * Late in (≥10:30 IST) and early out (≤16:30 IST), same IST calendar day.
 * Not counted on holiday / leave / WFH.
 */
export function detectHalfDay(
  punchIn: Date | null,
  punchOut: Date | null,
  isHoliday: boolean,
  isLeave: string
): boolean {
  if (isHoliday || isLeave === "Leave" || isLeave === "WFH") return false;
  if (!punchIn || !punchOut) return false;
  if (punchOut.getTime() <= punchIn.getTime()) return false;
  if (toDateKey(punchIn) !== toDateKey(punchOut)) return false;
  const inM = getMinutesSinceMidnightIST(punchIn);
  const outM = getMinutesSinceMidnightIST(punchOut);
  return inM >= HALF_DAY_IN_FROM && outM <= HALF_DAY_OUT_UNTIL;
}

export function calculateDifferenceMinutes(
  workingMinutes: number,
  isHoliday: boolean,
  isLeave: string,
  isHalfDay = false
): number {
  if (isHoliday || isLeave === "Leave" || isLeave === "WFH") return 0;
  const required = isHalfDay ? REQUIRED_MINUTES_PER_DAY / 2 : REQUIRED_MINUTES_PER_DAY;
  return workingMinutes - required;
}

export function formatDateDDMMYYYY(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
}

export function formatMinutesToDisplay(minutes: number): string {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = minutes < 0 ? "-" : "+";
  if (h > 0) return m > 0 ? `${sign}${h}h ${m}m` : `${sign}${h}h`;
  return `${sign}${m}m`;
}

export function formatWorkingTime(minutes: number): string {
  if (minutes <= 0) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/** `dateKey` + HTML time value → ISO string anchored in IST (stable for Mongo + display). */
export function buildAttendanceDateTimeISO(dateKey: string, timeHHmm: string): string {
  const trimmed = timeHHmm.trim();
  const [hRaw, mRaw] = trimmed.split(":");
  const h = (hRaw ?? "0").padStart(2, "0");
  const m = (mRaw ?? "0").padStart(2, "0");
  return `${dateKey}T${h}:${m}:00+05:30`;
}

/** Format stored instant as HH:mm in ATTENDANCE_TZ (same path as server + all deploy targets). */
export function formatClockTimeIST(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = getISTDateTimeParts(d);
  if (p) return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  try {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: ATTENDANCE_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return "";
  }
}

export function clockTimeToInputValue(iso: string | null | undefined): string {
  return formatClockTimeIST(iso);
}

export type AttendanceRecordLean = {
  _id?: unknown;
  punchIn?: Date | string | null;
  punchOut?: Date | string | null;
  isLeave?: string;
  isHoliday?: boolean;
};

export type AttendanceRowComputed = {
  _id?: unknown;
  date: string;
  dayName: string;
  punchIn: string | null;
  punchOut: string | null;
  isLeave: string;
  isHoliday: boolean;
  isHalfDay: boolean;
  workingMinutes: number;
  differenceMinutes: number;
  totalDifferenceMinutes: number;
};

export function buildAttendanceRows(
  dateKeys: string[],
  recordByKey: Map<string, AttendanceRecordLean | undefined>,
  todayStr: string
): AttendanceRowComputed[] {
  let runningDiff = 0;
  return dateKeys.map((key) => {
    const date = parseDateKeyToDate(key);
    const existing = recordByKey.get(key);
    const dayName = getDayName(date);
    const holiday = existing?.isHoliday ?? isSunday(date);
    const leave = existing?.isLeave ?? "None";
    const punchIn = existing?.punchIn ? new Date(existing.punchIn as string | Date) : null;
    const punchOut = existing?.punchOut ? new Date(existing.punchOut as string | Date) : null;
    const workingMinutes =
      holiday || leave === "Leave" || leave === "WFH"
        ? 0
        : calculateWorkingMinutes(punchIn, punchOut);
    const isHalfDay = detectHalfDay(punchIn, punchOut, holiday, leave);
    const diff = calculateDifferenceMinutes(workingMinutes, holiday, leave, isHalfDay);
    const isTodayNoOut = key === todayStr && !punchOut;
    const isFuture = key > todayStr;
    if (!isFuture && !isTodayNoOut) runningDiff += diff;
    return {
      _id: existing?._id,
      date: key,
      dayName,
      punchIn: punchIn?.toISOString() ?? null,
      punchOut: punchOut?.toISOString() ?? null,
      isLeave: leave,
      isHoliday: holiday,
      isHalfDay,
      workingMinutes,
      differenceMinutes: diff,
      totalDifferenceMinutes: runningDiff,
    };
  });
}

export function summarizeCycleStats(rows: Pick<AttendanceRowComputed, "isLeave" | "isHoliday" | "isHalfDay">[]) {
  return {
    leaves: rows.filter((r) => r.isLeave === "Leave").length,
    halfDays: rows.filter((r) => r.isHalfDay).length,
    wfh: rows.filter((r) => r.isLeave === "WFH").length,
    holidays: rows.filter((r) => r.isHoliday).length,
  };
}
