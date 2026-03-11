const REQUIRED_MINUTES_PER_DAY = 9 * 60;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function getAttendanceMonthBounds(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 2, 24);
  const end = new Date(year, month - 1, 23);
  return { start, end };
}

export function getAttendanceMonthFromDate(date: Date): { year: number; month: number } {
  const d = new Date(date);
  const day = d.getDate();
  if (day >= 24) {
    const next = new Date(d.getFullYear(), d.getMonth() + 1);
    return { year: next.getFullYear(), month: next.getMonth() + 1 };
  }
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function generateMonthDates(year: number, month: number): Date[] {
  const { start, end } = getAttendanceMonthBounds(year, month);
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDayName(date: Date): string {
  return DAY_NAMES[date.getDay()];
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

export function calculateWorkingMinutes(punchIn: Date | null, punchOut: Date | null): number {
  if (!punchIn || !punchOut) return 0;
  return Math.max(0, Math.floor((punchOut.getTime() - punchIn.getTime()) / 60000));
}

export function calculateDifferenceMinutes(
  workingMinutes: number,
  isHoliday: boolean,
  isLeave: string
): number {
  if (isHoliday || isLeave === "Leave") return 0;
  return workingMinutes - REQUIRED_MINUTES_PER_DAY;
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
