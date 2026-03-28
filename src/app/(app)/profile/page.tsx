"use client";

import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { HiOutlinePencilSquare, HiOutlineArrowRightOnRectangle } from "react-icons/hi2";
import { useSnackbar } from "@/components/Snackbar";

export default function ProfilePage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const [editingName, setEditingName] = useState(false);
  const [customName, setCustomName] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetch("/api/users/profile").then((r) => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: (name: string) =>
      fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customName: name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditingName(false);
      showSnackbar("Profile updated", "success");
    },
    onError: () => showSnackbar("Failed to update profile", "error"),
  });

  const displayName = profile?.displayName ?? profile?.name ?? (session?.user as { name?: string })?.name ?? "User";

  const startEdit = () => {
    setCustomName(profile?.customName ?? profile?.name ?? "");
    setEditingName(true);
  };

  const saveName = () => {
    updateMutation.mutate(customName);
  };

  return (
    <div className="space-y-6 px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-semibold text-[#000000]">Profile</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Manage your account</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white p-6 shadow-sm border border-[#E5E7EB]"
      >
        <div className="flex flex-col items-center gap-4">
          {profile?.profileImage || (session?.user as { image?: string })?.image ? (
            <Image
              src={profile?.profileImage || (session?.user as { image?: string })?.image || ""}
              alt=""
              width={80}
              height={80}
              className="rounded-full"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FDE8EA] text-2xl font-semibold text-[#cc161c]">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {editingName ? (
            <div className="w-full space-y-2">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Display name"
                className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-center"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={saveName}
                  disabled={updateMutation.isPending}
                  className="flex-1 rounded-xl bg-[#cc161c] py-2.5 text-white font-medium hover:bg-[#a81218]"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <span className="text-lg font-semibold text-[#000000]">{displayName}</span>
              <button
                onClick={startEdit}
                className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm text-[#cc161c]"
              >
                <HiOutlinePencilSquare className="h-4 w-4" />
                Edit name
              </button>
            </>
          )}
          {profile?.email && (
            <span className="text-sm text-[#6B7280]">{profile.email}</span>
          )}
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-4 text-red-600 font-medium"
      >
        <HiOutlineArrowRightOnRectangle className="h-5 w-5" />
        Log out
      </motion.button>
    </div>
  );
}
