"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HiOutlineFolder } from "react-icons/hi2";

export function FolderCard({ folder }: { folder: { _id: string; name: string } }) {
  return (
    <Link href={`/tables/${folder._id}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="rounded-2xl bg-white p-4 shadow-sm border border-[#E5E7EB]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
            <HiOutlineFolder className="h-5 w-5" />
          </div>
          <span className="font-medium text-[#111827] truncate">{folder.name}</span>
        </div>
      </motion.div>
    </Link>
  );
}
