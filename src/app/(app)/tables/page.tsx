"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { HiOutlinePlus } from "react-icons/hi2";
import { FolderCard } from "@/components/FolderCard";

export default function TablesPage() {
  const queryClient = useQueryClient();
  const [newFolderName, setNewFolderName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: folders, isLoading } = useQuery({
    queryKey: ["folders"],
    queryFn: () => fetch("/api/folders").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      setNewFolderName("");
      setShowForm(false);
    },
  });

  const handleCreate = () => {
    const name = newFolderName.trim();
    if (name) createMutation.mutate(name);
  };

  return (
    <div className="space-y-6 px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-semibold text-[#111827]">Workspace</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Organize tables and notes in folders</p>
      </motion.div>

      {showForm ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-2xl bg-white p-4 shadow-sm border border-[#E5E7EB]"
        >
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-[#111827] placeholder-[#9CA3AF]"
            autoFocus
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newFolderName.trim() || createMutation.isPending}
              className="rounded-xl bg-[#4F46E5] px-4 py-2 text-white font-medium"
            >
              Create
            </button>
            <button
              onClick={() => { setShowForm(false); setNewFolderName(""); }}
              className="rounded-xl border border-[#E5E7EB] px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E5E7EB] py-6 text-[#6B7280]"
        >
          <HiOutlinePlus className="h-5 w-5" />
          New folder
        </motion.button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {isLoading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#E5E7EB]" />
            ))
          : (folders ?? []).map((folder: { _id: string; name: string }, i: number) => (
              <motion.div
                key={folder._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <FolderCard folder={folder} />
              </motion.div>
            ))}
      </div>
    </div>
  );
}
