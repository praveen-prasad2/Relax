"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi2";
import { formatMinutesToDisplay } from "@/lib/attendance-calculator";
import { AttendanceTable } from "@/components/AttendanceTable";

export default function AttendancePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const isViewingCurrentMonth =
    year === new Date().getFullYear() && month === new Date().getMonth() + 1;
  const { data, isLoading } = useQuery({
    queryKey: ["attendance", year, month],
    queryFn: () => fetch(`/api/attendance?year=${year}&month=${month}`).then((r) => r.json()),
    refetchOnWindowFocus: true,
    refetchInterval: isViewingCurrentMonth ? 60_000 : false,
  });

  const monthLabel = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    return d.toLocaleString("default", { month: "long", year: "numeric" });
  }, [year, month]);

  const cycleLabel = useMemo(() => {
    const start = new Date(year, month - 2, 24);
    const end = new Date(year, month - 1, 23);
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
    return `${fmt(start)} – ${fmt(end)}`;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  return (
    <div className="space-y-4 px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-[#111827]">{monthLabel}</h1>
            {!isLoading && data?.rows?.length > 0 && (() => {
              const todayStr = new Date().toISOString().slice(0, 10);
              const lastRowUpToToday = [...data.rows].reverse().find((r: { date: string }) => r.date <= todayStr);
              const total = lastRowUpToToday?.totalDifferenceMinutes ?? data.rows[data.rows.length - 1]?.totalDifferenceMinutes ?? 0;
              return (
                <span className={`text-lg font-semibold ${total >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatMinutesToDisplay(total)}
                </span>
              );
            })()}
          </div>
          <p className="text-sm text-[#6B7280]">{cycleLabel}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280]">
            <HiOutlineChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={nextMonth} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280]">
            <HiOutlineChevronRight className="h-5 w-5" />
          </button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-[#E5E7EB]" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${year}-${month}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AttendanceTable rows={data?.rows ?? []} year={year} month={month} />
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
