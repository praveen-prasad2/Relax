"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { HiOutlinePencilSquare } from "react-icons/hi2";
import { formatMinutesToDisplay, formatDateDDMMYYYY, formatWorkingTime } from "@/lib/attendance-calculator";

type FilterType = "all" | "leave" | "holiday" | "worked";

interface Row {
  _id?: string;
  date: string;
  dayName: string;
  punchIn: string | null;
  punchOut: string | null;
  isLeave: string;
  isHoliday: boolean;
  workingMinutes: number;
  differenceMinutes: number;
  totalDifferenceMinutes: number;
}

export function AttendanceTable({
  rows,
  year,
  month,
}: {
  rows: Row[];
  year: number;
  month: number;
}) {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [filter, setFilter] = useState<FilterType>("all");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Row>>({});

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "leave") return rows.filter((r) => r.isLeave === "Leave");
    if (filter === "holiday") return rows.filter((r) => r.isHoliday);
    if (filter === "worked") return rows.filter((r) => r.isLeave !== "Leave" && !r.isHoliday);
    return rows;
  }, [rows, filter]);

  const mutation = useMutation({
    mutationFn: (payload: { date: string; punchIn?: string; punchOut?: string; isLeave?: string; isHoliday?: boolean }) =>
      fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", year, month] });
      setEditingRow(null);
    },
  });

  const timeToInput = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toTimeString().slice(0, 5);
  };

  const startEdit = (row: Row) => {
    setEditingRow(row.date);
    setForm({ punchIn: row.punchIn, punchOut: row.punchOut, isLeave: row.isLeave, isHoliday: row.isHoliday });
  };

  const save = () => {
    if (!editingRow) return;
    mutation.mutate({
      date: editingRow,
      punchIn: form.punchIn ?? undefined,
      punchOut: form.punchOut ?? undefined,
      isLeave: form.isLeave ?? undefined,
      isHoliday: form.isHoliday,
    });
  };

  const headerLabels = ["Date", "Day", "In", "Out", "Leave", "Holiday", "Worked", "Daily Diff", "Total Diff", "Actions"];

  const filterButtons: { key: FilterType; label: string; className: string }[] = [
    { key: "all", label: "All", className: filter === "all" ? "bg-[#4F46E5] text-white" : "bg-white text-[#6B7280] border border-[#E5E7EB]" },
    { key: "leave", label: "Leave", className: filter === "leave" ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-700 border border-orange-200" },
    { key: "holiday", label: "Holiday", className: filter === "holiday" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700 border border-amber-200" },
    { key: "worked", label: "Worked", className: filter === "worked" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  ];

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {filterButtons.map(({ key, label, className }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${className}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-w-[650px] space-y-2">
        <div className="flex flex-wrap gap-x-2 gap-y-2 px-3 py-2 text-xs font-medium text-[#6B7280] border-b border-[#E5E7EB] mb-2">
          {headerLabels.map((l, i) => (
            <span key={i} className={i === 0 ? "min-w-[90px]" : i === 1 ? "min-w-[70px]" : i < 6 ? "min-w-[55px]" : i < 9 ? "min-w-[60px]" : "min-w-[50px]"}>
              {l}
            </span>
          ))}
        </div>
        {filteredRows.map((row, i) => {
          const isToday = row.date === todayStr;
          const isFuture = row.date > todayStr;
          const canEdit = !isFuture;
          const isEditing = editingRow === row.date;

          return (
            <motion.div
              key={row.date}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`rounded-xl border overflow-hidden ${
                isToday ? "border-[#4F46E5] bg-[#EEF2FF]/50" : "border-[#E5E7EB] bg-white"
              }`}
            >
              <div className="flex flex-wrap gap-x-2 gap-y-2 p-3 text-sm items-center">
                {isEditing ? (
                  <div className="flex flex-wrap gap-3 w-full">
                    <div>
                      <span className="font-medium text-[#111827]">{formatDateDDMMYYYY(row.date)}</span>
                      <span className="ml-1 text-[#6B7280]">{row.dayName}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="time"
                        value={timeToInput(form.punchIn ?? null)}
                        onChange={(e) => setForm((f) => ({ ...f, punchIn: e.target.value ? `${row.date}T${e.target.value}:00` : undefined }))}
                        className="rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm"
                      />
                      <input
                        type="time"
                        value={timeToInput(form.punchOut ?? null)}
                        onChange={(e) => setForm((f) => ({ ...f, punchOut: e.target.value ? `${row.date}T${e.target.value}:00` : undefined }))}
                        className="rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm"
                      />
                      <select
                        value={form.isLeave ?? "None"}
                        onChange={(e) => setForm((f) => ({ ...f, isLeave: e.target.value as "None" | "Leave" }))}
                        className="rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm"
                      >
                        <option value="None">None</option>
                        <option value="Leave">Leave</option>
                      </select>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={form.isHoliday ?? row.isHoliday}
                          onChange={(e) => setForm((f) => ({ ...f, isHoliday: e.target.checked }))}
                          className="rounded"
                        />
                        <span className="text-xs">Holiday</span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={save}
                        disabled={mutation.isPending}
                        className="rounded-lg bg-[#4F46E5] px-3 py-1.5 text-white text-sm font-medium"
                      >
                        Save
                      </button>
                      <button onClick={() => setEditingRow(null)} className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-[90px]">
                      <span className="font-medium text-[#111827]">{formatDateDDMMYYYY(row.date)}</span>
                      {isToday && <span className="ml-1 text-[#4F46E5] text-xs">Today</span>}
                    </div>
                    <span className="min-w-[70px] text-[#6B7280]">{row.dayName}</span>
                    <span className="min-w-[55px] text-[#6B7280]">
                      {row.punchIn ? new Date(row.punchIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-"}
                    </span>
                    <span className="min-w-[55px] text-[#6B7280]">
                      {row.punchOut ? new Date(row.punchOut).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-"}
                    </span>
                    <span className={`min-w-[45px] ${row.isLeave === "Leave" ? "rounded-md bg-orange-500 px-2 py-0.5 text-sm font-medium text-white" : "text-[#6B7280]"}`}>
                      {row.isLeave}
                    </span>
                    <span className={`min-w-[45px] ${row.isHoliday ? "rounded-md bg-purple-300 px-2 py-0.5 text-sm font-medium text-black " : "text-[#6B7280]"}`}>
                      {row.isHoliday ? "Yes" : "-"}
                    </span>
                    <span className="min-w-[60px] text-[#6B7280]">{formatWorkingTime(row.workingMinutes)}</span>
                    <span className={`min-w-[55px] font-medium ${!isFuture && (row.differenceMinutes > 0 ? "text-emerald-600" : row.differenceMinutes < 0 ? "text-red-600" : "text-[#6B7280]")}`}>
                      {isFuture ? "-" : formatMinutesToDisplay(row.differenceMinutes)}
                    </span>
                    <span className={`min-w-[60px] font-medium ${!isFuture && (row.totalDifferenceMinutes >= 0 ? "text-emerald-600" : "text-red-600")}`}>
                      {isFuture ? "-" : formatMinutesToDisplay(row.totalDifferenceMinutes)}
                    </span>
                    {canEdit ? (
                      <button
                        onClick={() => startEdit(row)}
                        className="min-w-[50px] rounded-lg border border-[#E5E7EB] px-2 py-1 text-xs text-[#4F46E5] flex items-center gap-1"
                      >
                        <HiOutlinePencilSquare className="h-4 w-4" />
                        Edit
                      </button>
                    ) : (
                      <span className="min-w-[50px] text-[#9CA3AF]">-</span>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
