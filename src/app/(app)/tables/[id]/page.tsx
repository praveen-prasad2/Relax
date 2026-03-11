"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import { TableEditor } from "@/components/TableEditor";
import { NotesEditor } from "@/components/NotesEditor";

type Tab = "tables" | "notes";

export default function FolderPage() {
  const params = useParams();
  const id = params.id as string;
  const [tab, setTab] = useState<Tab>("tables");

  const { data: folder, isLoading } = useQuery({
    queryKey: ["folder", id],
    queryFn: () => fetch(`/api/folders/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  if (isLoading || !folder) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-6 pb-24">
      <Link href="/tables" className="inline-flex items-center gap-1 text-sm text-[#4F46E5]">
        <HiOutlineArrowLeft className="h-4 w-4" />
        Back to workspace
      </Link>
      <h1 className="text-xl font-semibold text-[#111827]">{folder.name}</h1>

      <div className="flex rounded-xl bg-[#F3F4F6] p-1">
        <button
          onClick={() => setTab("tables")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            tab === "tables" ? "bg-white text-[#111827] shadow" : "text-[#6B7280]"
          }`}
        >
          Tables
        </button>
        <button
          onClick={() => setTab("notes")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            tab === "notes" ? "bg-white text-[#111827] shadow" : "text-[#6B7280]"
          }`}
        >
          Notes
        </button>
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {tab === "tables" ? (
          <TableEditor folderId={id} />
        ) : (
          <NotesEditor folderId={id} />
        )}
      </motion.div>
    </div>
  );
}
