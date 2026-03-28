"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { HiOutlineArrowLeft } from "react-icons/hi2";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/attendance": "Attendance",
  "/profile": "Profile",
};

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
}

export function Header({ title: titleProp, showBack, backHref }: HeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetch("/api/users/profile").then((r) => r.json()),
  });
  const title = titleProp ?? titles[pathname] ?? "TimeForge by Praveen";
  const displayName = profile?.displayName ?? (session?.user as { name?: string })?.name ?? "User";

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#E5E7EB] bg-white/95 px-4 backdrop-blur safe-area-top"
    >
      <div className="flex items-center gap-2">
        {showBack && backHref && (
          <Link href={backHref} className="flex h-10 w-10 items-center justify-center rounded-full text-[#6B7280] hover:bg-[#F3F4F6]">
            <HiOutlineArrowLeft className="h-5 w-5" />
          </Link>
        )}
        {title && <span className="text-lg font-semibold text-[#000000]">{title}</span>}
      </div>
      <div className="flex items-center gap-2">
        {(() => {
          const img = (session?.user as { image?: string })?.image;
          return img ? (
            <Image src={img} alt="" width={32} height={32} className="rounded-full" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FDE8EA] text-sm font-medium text-[#cc161c]">
              {displayName.charAt(0).toUpperCase()}
            </div>
          );
        })()}
        <span className="max-w-[100px] truncate text-sm text-[#6B7280]">{displayName}</span>
      </div>
    </motion.header>
  );
}
