"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  formatMinutesToDisplay,
  formatWorkingTime,
  getAttendanceMonthFromDate,
  toDateKey,
  summarizeCycleStats,
} from "@/lib/attendance-calculator";

function CardSkeleton() {
  return <div className="h-24 animate-pulse rounded-2xl bg-[#E5E7EB]" />;
}

function StatSkeleton() {
  return <div className="h-20 animate-pulse rounded-xl bg-[#E5E7EB]" />;
}

export default function DashboardPage() {
  const { year, month } = getAttendanceMonthFromDate(new Date());
  const todayKey = toDateKey(new Date());

  const { data: today, isLoading: todayLoading } = useQuery({
    queryKey: ["attendance-today"],
    queryFn: () =>
      fetch(`/api/attendance/today?date=${todayKey}`, { credentials: "include" }).then((r) => r.json()),
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  const { data: monthData, isLoading: monthLoading } = useQuery({
    queryKey: ["attendance", year, month],
    queryFn: () =>
      fetch(`/api/attendance?year=${year}&month=${month}&today=${todayKey}`, {
        credentials: "include",
      }).then((r) => r.json()),
    refetchOnWindowFocus: true,
  });

  const stats = useMemo(
    () => summarizeCycleStats(monthData?.rows ?? []),
    [monthData?.rows]
  );

  const todayStatus = today?.today;
  const monthlyDiff = today?.monthlyDifferenceMinutes ?? 0;
  const currentMonth = (() => {
    const { year: y, month: m } = getAttendanceMonthFromDate(new Date());
    return new Date(y, m - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
  })();

  return (
    <div className="space-y-6 px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-xl font-semibold text-[#000000]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Attendance overview</p>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="space-y-3"
      >
        <h2 className="text-sm font-medium text-[#6B7280]">This cycle ({currentMonth})</h2>
        {monthLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Leaves", value: stats.leaves, className: "bg-orange-50 border-orange-100 text-orange-800" },
              { label: "Half days", value: stats.halfDays, className: "bg-sky-50 border-sky-100 text-sky-900" },
              { label: "WFH", value: stats.wfh, className: "bg-[#FDE8EA] border-[#f5c2c7] text-[#991b1b]" },
              { label: "Holidays", value: stats.holidays, className: "bg-amber-50 border-amber-100 text-amber-900" },
            ].map(({ label, value, className }) => (
              <div
                key={label}
                className={`rounded-xl border p-4 shadow-sm ${className}`}
              >
                <p className="text-xs font-medium opacity-80">{label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-3"
      >
        <h2 className="text-sm font-medium text-[#6B7280]">Today</h2>
        {todayLoading ? (
          <CardSkeleton />
        ) : (
          <Link href="/attendance">
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="rounded-2xl bg-white p-4 shadow-sm border border-[#E5E7EB]"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#000000]">Attendance</span>
                <span
                  className={`text-sm font-semibold ${
                    todayStatus?.isHoliday
                      ? "text-amber-600"
                      : todayStatus?.isLeave === "Leave"
                        ? "text-orange-600"
                        : todayStatus?.isLeave === "WFH"
                          ? "text-[#cc161c]"
                          : todayStatus?.isHalfDay
                            ? "text-sky-700"
                            : "text-[#cc161c]"
                  }`}
                >
                  {todayStatus?.isHoliday
                    ? "Holiday"
                    : todayStatus?.isLeave === "Leave"
                      ? "Leave"
                      : todayStatus?.isLeave === "WFH"
                        ? "WFH"
                        : todayStatus?.isHalfDay
                          ? "Half day"
                          : todayStatus?.punchIn
                            ? "Logged"
                            : "Not logged"}
                </span>
              </div>
              {todayStatus?.workingMinutes !== undefined && todayStatus.workingMinutes > 0 && (
                <p className="mt-1 text-sm text-[#6B7280]">
                  Worked: {formatWorkingTime(todayStatus.workingMinutes)}
                </p>
              )}
            </motion.div>
          </Link>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h2 className="text-sm font-medium text-[#6B7280]">Monthly balance</h2>
        {todayLoading ? (
          <CardSkeleton />
        ) : (
          <Link href="/attendance">
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="rounded-2xl bg-white p-4 shadow-sm border border-[#E5E7EB]"
            >
              <span className="font-medium text-[#000000]">Work difference</span>
              <p className={`mt-1 text-lg font-bold ${monthlyDiff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatMinutesToDisplay(monthlyDiff)}
              </p>
              <p className="text-xs text-[#6B7280]">{currentMonth} (24th – 23rd cycle)</p>
            </motion.div>
          </Link>
        )}
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Link href="/attendance">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#cc161c] py-4 text-white font-medium shadow-md hover:bg-[#a81218]"
          >
            Open attendance
          </motion.button>
        </Link>
      </motion.section>
    </div>
  );
}
