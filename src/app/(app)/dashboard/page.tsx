"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { HiOutlinePlus } from "react-icons/hi2";
import { formatMinutesToDisplay, formatWorkingTime, getAttendanceMonthFromDate } from "@/lib/attendance-calculator";
import { FolderCard } from "@/components/FolderCard";

function CardSkeleton() {
  return (
    <div className="h-24 animate-pulse rounded-2xl bg-[#E5E7EB]" />
  );
}

export default function DashboardPage() {
  const { data: today, isLoading: todayLoading } = useQuery({
    queryKey: ["attendance-today"],
    queryFn: () => {
      const n = new Date();
      const d = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
      return fetch(`/api/attendance/today?date=${d}`).then((r) => r.json());
    },
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ["folders"],
    queryFn: () => fetch("/api/folders").then((r) => r.json()),
  });

  const todayStatus = today?.today;
  const monthlyDiff = today?.monthlyDifferenceMinutes ?? 0;
  const recentFolders = (folders ?? []).slice(0, 4);
  const currentMonth = (() => {
    const { year, month } = getAttendanceMonthFromDate(new Date());
    return new Date(year, month - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
  })();

  return (
    <div className="space-y-6 px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-xl font-semibold text-[#111827]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Your productivity at a glance</p>
      </motion.div>

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
                <span className="font-medium text-[#111827]">Attendance</span>
                <span
                  className={`text-sm font-semibold ${
                    todayStatus?.isHoliday
                      ? "text-amber-600"
                      : todayStatus?.isLeave === "Leave"
                        ? "text-orange-600"
                        : todayStatus?.isLeave === "WFH"
                          ? "text-blue-600"
                          : "text-[#4F46E5]"
                  }`}
                >
                  {todayStatus?.isHoliday
                    ? "Holiday"
                    : todayStatus?.isLeave === "Leave"
                      ? "Leave"
                      : todayStatus?.isLeave === "WFH"
                        ? "WFH"
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
        <h2 className="text-sm font-medium text-[#6B7280]">Monthly Balance</h2>
        {todayLoading ? (
          <CardSkeleton />
        ) : (
          <Link href="/attendance">
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="rounded-2xl bg-white p-4 shadow-sm border border-[#E5E7EB]"
            >
              <span className="font-medium text-[#111827]">Work difference</span>
              <p className={`mt-1 text-lg font-bold ${monthlyDiff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatMinutesToDisplay(monthlyDiff)}
              </p>
              <p className="text-xs text-[#6B7280]">{currentMonth} (24th – 23rd cycle)</p>
            </motion.div>
          </Link>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#6B7280]">Recent Folders</h2>
          <Link href="/tables" className="text-sm font-medium text-[#4F46E5]">
            View all
          </Link>
        </div>
        {foldersLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : recentFolders.length === 0 ? (
          <Link href="/tables">
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E5E7EB] py-8 text-[#6B7280]"
            >
              <span className="text-sm">No folders yet</span>
              <span className="text-xs">Tap to create</span>
            </motion.div>
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recentFolders.map((folder: { _id: string; name: string }, i: number) => (
              <motion.div
                key={folder._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                <FolderCard folder={folder} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Link href="/tables">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] py-4 text-white font-medium shadow-md"
          >
            <HiOutlinePlus className="h-5 w-5" />
            Quick create note
          </motion.button>
        </Link>
      </motion.section>
    </div>
  );
}
