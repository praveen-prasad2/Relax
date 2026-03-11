"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { HiOutlinePlus, HiOutlineArrowLeft, HiOutlineTableCells } from "react-icons/hi2";

interface TableData {
  _id: string;
  name: string;
  columns: string[];
  rows: Record<string, string>[];
}

export function TableEditor({ folderId }: { folderId: string }) {
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [newTableName, setNewTableName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: tables, isLoading } = useQuery({
    queryKey: ["tables", folderId],
    queryFn: () => fetch(`/api/folders/${folderId}/tables`).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      fetch(`/api/folders/${folderId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", folderId] });
      setNewTableName("");
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; columns?: string[]; rows?: Record<string, string>[] }) =>
      fetch(`/api/tables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", folderId] });
      queryClient.invalidateQueries({ queryKey: ["table", selectedTable?._id] });
    },
  });

  if (selectedTable) {
    return (
      <TableDetail
        table={selectedTable}
        onBack={() => setSelectedTable(null)}
        onUpdate={(updates) => updateMutation.mutate({ id: selectedTable._id, ...updates })}
        isUpdating={updateMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-4">
      {showCreate ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl bg-white p-4 shadow-sm border border-[#E5E7EB]"
        >
          <input
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            placeholder="Table name"
            className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3"
            autoFocus
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => createMutation.mutate(newTableName.trim())}
              disabled={!newTableName.trim() || createMutation.isPending}
              className="rounded-xl bg-[#4F46E5] px-4 py-2 text-white font-medium"
            >
              Create
            </button>
            <button onClick={() => { setShowCreate(false); setNewTableName(""); }} className="rounded-xl border px-4 py-2">
              Cancel
            </button>
          </div>
        </motion.div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E5E7EB] py-4 text-[#6B7280]"
        >
          <HiOutlinePlus className="h-5 w-5" />
          New table
        </button>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-[#E5E7EB]" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(tables ?? []).map((t: TableData) => (
            <motion.button
              key={t._id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedTable(t)}
              className="flex w-full items-center gap-3 rounded-xl bg-white p-4 text-left shadow-sm border border-[#E5E7EB]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
                <HiOutlineTableCells className="h-5 w-5" />
              </div>
              <span className="font-medium text-[#111827]">{t.name}</span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function TableDetail({
  table,
  onBack,
  onUpdate,
  isUpdating,
}: {
  table: TableData;
  onBack: () => void;
  onUpdate: (u: { name?: string; columns?: string[]; rows?: Record<string, string>[] }) => void;
  isUpdating: boolean;
}) {
  const [editedName, setEditedName] = useState(table.name);
  const [columns, setColumns] = useState(table.columns);
  const [rows, setRows] = useState(table.rows);
  const latestRowsRef = useRef(rows);
  latestRowsRef.current = rows;

  const addColumn = () => {
    const newCol = `Column ${columns.length + 1}`;
    const nextCols = [...columns, newCol];
    const nextRows = rows.map((r) => ({ ...r, [newCol]: "" }));
    setColumns(nextCols);
    setRows(nextRows);
    latestRowsRef.current = nextRows;
    onUpdate({ columns: nextCols, rows: nextRows });
  };

  const renameColumn = (idx: number, name: string) => {
    const oldKey = columns[idx];
    const nextCols = [...columns];
    nextCols[idx] = name;
    const nextRows = rows.map((r) => {
      const { [oldKey]: _, ...rest } = r;
      return { ...rest, [name]: r[oldKey] ?? "" };
    });
    setColumns(nextCols);
    setRows(nextRows);
    latestRowsRef.current = nextRows;
    onUpdate({ columns: nextCols, rows: nextRows });
  };

  const addRow = () => {
    const newRow: Record<string, string> = {};
    columns.forEach((c) => (newRow[c] = ""));
    const next = [...rows, newRow];
    setRows(next);
    latestRowsRef.current = next;
    onUpdate({ rows: next });
  };

  const updateCell = (rowIdx: number, colKey: string, value: string) => {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [colKey]: value } : r));
    latestRowsRef.current = next;
    setRows(next);
  };

  const saveName = () => {
    if (editedName !== table.name) onUpdate({ name: editedName });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#4F46E5]">
        <HiOutlineArrowLeft className="h-4 w-4" />
        Back
      </button>
      <div>
        <input
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onBlur={saveName}
          className="text-lg font-semibold text-[#111827] bg-transparent border-b border-transparent hover:border-[#E5E7EB] focus:border-[#4F46E5] outline-none"
        />
      </div>
      <div className="overflow-x-auto -mx-4">
        <div className="min-w-[400px] rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="flex bg-[#F9FAFB] border-b border-[#E5E7EB]">
            {columns.map((col, idx) => (
              <div key={idx} className="flex-1 min-w-[100px] p-2 border-r border-[#E5E7EB] last:border-r-0">
                <input
                  value={col}
                  onChange={(e) => renameColumn(idx, e.target.value)}
                  className="w-full text-sm font-medium bg-transparent outline-none"
                />
              </div>
            ))}
            <button
              onClick={addColumn}
              className="p-2 text-[#4F46E5] text-sm font-medium min-w-[80px]"
            >
              + Column
            </button>
          </div>
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex border-b border-[#E5E7EB] last:border-b-0">
              {columns.map((col) => (
                <div key={col} className="flex-1 min-w-[100px] p-2 border-r border-[#E5E7EB] last:border-r-0">
                  <input
                    value={row[col] ?? ""}
                    onChange={(e) => updateCell(rowIdx, col, e.target.value)}
                    onBlur={() => onUpdate({ rows: latestRowsRef.current })}
                    className="w-full text-sm bg-transparent outline-none"
                  />
                </div>
              ))}
              <div className="min-w-[80px]" />
            </div>
          ))}
          <button
            onClick={addRow}
            className="w-full py-3 text-sm text-[#4F46E5] font-medium border-t border-[#E5E7EB]"
          >
            + Add row
          </button>
        </div>
      </div>
      {isUpdating && (
        <span className="text-xs text-[#6B7280]">Saving...</span>
      )}
    </motion.div>
  );
}
