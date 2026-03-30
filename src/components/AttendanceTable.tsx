"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { HiOutlinePencilSquare } from "react-icons/hi2";
import {
  formatMinutesToDisplay,
  formatDateDDMMYYYY,
  formatWorkingTime,
  toDateKey,
  formatClockTimeIST,
  clockTimeToInputValue,
  buildAttendanceDateTimeISO,
  resolvePunchOutIso,
  compareDateKeys,
} from "@/lib/attendance-calculator";
import { useSnackbar } from "@/components/Snackbar";

type FilterType = "all" | "leave" | "holiday" | "wfh" | "halfday" | "worked";

interface Row {
  _id?: string;
  date: string;
  dayName: string;
  punchIn: string | null;
  punchOut: string | null;
  punchInDisplay?: string | null;
  punchOutDisplay?: string | null;
  isLeave: string;
  isHoliday: boolean;
  isHalfDay?: boolean;
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
  const { showSnackbar } = useSnackbar();
  const todayStr = toDateKey(new Date());
  const [filter, setFilter] = useState<FilterType>("all");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Row>>({});

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "leave") return rows.filter((r) => r.isLeave === "Leave");
    if (filter === "holiday") return rows.filter((r) => r.isHoliday);
    if (filter === "wfh") return rows.filter((r) => r.isLeave === "WFH");
    if (filter === "halfday") return rows.filter((r) => r.isHalfDay);
    if (filter === "worked")
      return rows.filter(
        (r) =>
          r.isLeave !== "Leave" &&
          r.isLeave !== "WFH" &&
          !r.isHoliday &&
          !r.isHalfDay
      );
    return rows;
  }, [rows, filter]);

  const mutation = useMutation({
    mutationFn: async (payload: {
      date: string;
      punchIn: string | null;
      punchOut: string | null;
      isLeave: string;
      isHoliday: boolean;
    }) => {
      const res = await fetch("/api/attendance", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
      if (data.ok !== true) throw new Error(data.error || "Save failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", year, month] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      setEditingRow(null);
      showSnackbar("Attendance saved", "success");
    },
    onError: (err: Error) => showSnackbar(err.message || "Failed to save", "error"),
  });

  const formatTimeAsEntered = (iso: string | null, display?: string | null) =>
    (display ?? formatClockTimeIST(iso)) || "-";
  const timeToInput = (iso: string | null, display?: string | null) => display ?? clockTimeToInputValue(iso);

  const startEdit = (row: Row) => {
    setEditingRow(row.date);
    setForm({
      punchIn: row.punchIn,
      punchOut: row.punchOut,
      punchInDisplay: row.punchInDisplay,
      punchOutDisplay: row.punchOutDisplay,
      isLeave: row.isLeave,
      isHoliday: row.isHoliday,
    });
  };

  const save = () => {
    if (!editingRow) return;
    mutation.mutate({
      date: editingRow,
      punchIn: form.punchIn ?? null,
      punchOut: form.punchOut ?? null,
      isLeave: form.isLeave ?? "None",
      isHoliday: form.isHoliday ?? false,
    });
  };

  const headerLabels = ["Date", "Day", "In (IST)", "Out (IST)", "Status", "Holiday", "Worked", "Daily Diff", "Total Diff", "Actions"];

  const filterButtons: { key: FilterType; label: string; className: string }[] = [
    { key: "all", label: "All", className: filter === "all" ? "bg-[#cc161c] text-white" : "bg-white text-[#6B7280] border border-[#E5E7EB]" },
    { key: "leave", label: "Leave", className: filter === "leave" ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-700 border border-orange-200" },
    { key: "holiday", label: "Holiday", className: filter === "holiday" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700 border border-amber-200" },
    { key: "wfh", label: "WFH", className: filter === "wfh" ? "bg-[#cc161c] text-white" : "bg-white text-[#6B7280] border border-[#E5E7EB]" },
    { key: "halfday", label: "Half day", className: filter === "halfday" ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-800 border border-sky-200" },
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
          const isToday = compareDateKeys(row.date, todayStr) === 0;
          const isFuture = compareDateKeys(row.date, todayStr) > 0;
          const canEdit = !isFuture;
          const isEditing = editingRow === row.date;
          const isHolidayRow = isEditing ? (form.isHoliday ?? row.isHoliday) : row.isHoliday;

          return (
            <motion.div
              key={row.date}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0 }}
              className={`rounded-xl border overflow-hidden ${
                isHolidayRow
                  ? `border-[#d65c62] bg-[#e07377] ${isToday ? "ring-2 ring-[#cc161c] ring-offset-1" : ""}`
                  : isToday
                    ? "border-[#cc161c] bg-[#FDE8EA]/50"
                    : "border-[#E5E7EB] bg-white"
              }`}
            >
              <div className="flex flex-wrap gap-x-2 gap-y-2 p-3 text-sm items-center">
                {isEditing ? (
                  <div className="flex flex-wrap gap-3 w-full">
                    <div>
                      <span className="font-medium text-[#000000]">{formatDateDDMMYYYY(row.date)}</span>
                      <span className="ml-1 text-[#6B7280]">{row.dayName}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="time"
                        value={timeToInput(form.punchIn ?? null, form.punchInDisplay ?? undefined)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((f) => {
                            const punchIn = v ? buildAttendanceDateTimeISO(row.date, v) : undefined;
                            const punchInDisplay = v || undefined;
                            let punchOut = f.punchOut;
                            let punchOutDisplay = f.punchOutDisplay;
                            if (v && f.punchOutDisplay) {
                              const resolved = resolvePunchOutIso(row.date, punchIn ?? null, f.punchOutDisplay);
                              if (resolved) {
                                punchOut = resolved;
                              }
                            }
                            return { ...f, punchIn, punchInDisplay, punchOut, punchOutDisplay };
                          });
                        }}
                        className="rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm"
                      />
                      <input
                        type="time"
                        value={timeToInput(form.punchOut ?? null, form.punchOutDisplay ?? undefined)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((f) => ({
                            ...f,
                            punchOut: v ? resolvePunchOutIso(row.date, f.punchIn ?? null, v) ?? undefined : undefined,
                            punchOutDisplay: v || undefined,
                          }));
                        }}
                        className="rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm"
                      />
                      <select
                        value={form.isLeave ?? "None"}
                        onChange={(e) => setForm((f) => ({ ...f, isLeave: e.target.value as "None" | "Leave" | "WFH" }))}
                        className="rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm"
                      >
                        <option value="None">None</option>
                        <option value="Leave">Leave</option>
                        <option value="WFH">WFH</option>
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
                        className="rounded-lg bg-[#cc161c] px-3 py-1.5 text-white text-sm font-medium hover:bg-[#a81218]"
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
                      <span className="font-medium text-[#000000]">{formatDateDDMMYYYY(row.date)}</span>
                      {isToday && <span className="ml-1 text-[#cc161c] text-xs">Today</span>}
                    </div>
                    <span className="min-w-[70px] text-[#6B7280]">{row.dayName}</span>
                    <span className="min-w-[55px] text-[#6B7280]">{formatTimeAsEntered(row.punchIn, row.punchInDisplay)}</span>
                    <span className="min-w-[55px] text-[#6B7280]">{formatTimeAsEntered(row.punchOut, row.punchOutDisplay)}</span>
                    <span className="min-w-[56px]">
                      {row.isLeave === "Leave" ? (
                        <span className="rounded-md bg-orange-500 px-2 py-0.5 text-xs font-medium text-white">Leave</span>
                      ) : row.isLeave === "WFH" ? (
                        <span className="rounded-md bg-[#cc161c] px-2 py-0.5 text-xs font-medium text-white">WFH</span>
                      ) : row.isHalfDay ? (
                        <span className="rounded-md bg-sky-600 px-2 py-0.5 text-xs font-medium text-white">Half</span>
                      ) : (
                        <span className="text-[#6B7280]">{row.isLeave}</span>
                      )}
                    </span>
                    <span
                      className={`min-w-[45px] ${
                        row.isHoliday
                          ? "rounded-md bg-white/35 px-2 py-0.5 text-sm font-medium text-[#000000]"
                          : "text-[#6B7280]"
                      }`}
                    >
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
                        className="min-w-[50px] rounded-lg border border-[#E5E7EB] px-2 py-1 text-xs text-[#cc161c] flex items-center gap-1"
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
