"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";

interface SearchResults {
  folders: { _id: string; name: string }[];
  tables: { _id: string; name: string; folderId: string }[];
  notes: { _id: string; title: string; folderId: string }[];
  attendance: { date: string; dayName: string }[];
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", debouncedQ],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`).then((r) => r.json()),
    enabled: debouncedQ.length >= 2,
  });

  const results: SearchResults = data ?? { folders: [], tables: [], notes: [], attendance: [] };
  const hasResults =
    results.folders.length > 0 ||
    results.tables.length > 0 ||
    results.notes.length > 0 ||
    results.attendance.length > 0;

  return (
    <div className="space-y-4 px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-semibold text-[#111827]">Search</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Find folders, tables, notes, and attendance</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative"
      >
        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          className="w-full rounded-2xl border border-[#E5E7EB] bg-white py-3.5 pl-11 pr-4 text-[#111827] placeholder-[#9CA3AF]"
        />
      </motion.div>

      {debouncedQ.length < 2 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-[#6B7280] shadow-sm border border-[#E5E7EB]">
          Type at least 2 characters to search
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-[#E5E7EB]" />
          ))}
        </div>
      ) : !hasResults ? (
        <div className="rounded-2xl bg-white p-8 text-center text-[#6B7280] shadow-sm border border-[#E5E7EB]">
          No results for &quot;{debouncedQ}&quot;
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {results.folders.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-[#6B7280]">Folders</h2>
              <div className="space-y-2">
                {results.folders.map((f) => (
                  <Link key={f._id} href={`/tables/${f._id}`}>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="rounded-xl bg-white p-4 shadow-sm border border-[#E5E7EB]"
                    >
                      <span className="font-medium text-[#111827]">{f.name}</span>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {results.tables.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-[#6B7280]">Tables</h2>
              <div className="space-y-2">
                {results.tables.map((t) => (
                  <Link key={t._id} href={`/tables/${(t as { folderId?: string }).folderId}`}>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="rounded-xl bg-white p-4 shadow-sm border border-[#E5E7EB]"
                    >
                      <span className="font-medium text-[#111827]">{t.name}</span>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {results.notes.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-[#6B7280]">Notes</h2>
              <div className="space-y-2">
                {results.notes.map((n) => (
                  <Link key={n._id} href={`/tables/${(n as { folderId?: string }).folderId}`}>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="rounded-xl bg-white p-4 shadow-sm border border-[#E5E7EB]"
                    >
                      <span className="font-medium text-[#111827]">{n.title}</span>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {results.attendance.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-[#6B7280]">Attendance</h2>
              <div className="space-y-2">
                {results.attendance.map((a, i) => (
                  <Link key={`${a.date}-${i}`} href="/attendance">
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="rounded-xl bg-white p-4 shadow-sm border border-[#E5E7EB]"
                    >
                      <span className="font-medium text-[#111827]">{a.date}</span>
                      <span className="ml-2 text-[#6B7280]">{a.dayName}</span>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </motion.div>
      )}
    </div>
  );
}
