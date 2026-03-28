"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { HiOutlineHome, HiOutlineCalendarDays, HiOutlineUser } from "react-icons/hi2";

const navItems = [
  { href: "/dashboard", label: "Home", Icon: HiOutlineHome },
  { href: "/attendance", label: "Attendance", Icon: HiOutlineCalendarDays },
  { href: "/profile", label: "Profile", Icon: HiOutlineUser },
];

export function BottomNavbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E5E7EB] bg-white/95 backdrop-blur safe-area-bottom">
      <div className="flex h-16 items-center justify-around">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex min-w-[64px] flex-col items-center justify-center gap-1 py-2 transition-colors active:opacity-70"
            >
              {active ? (
                <motion.div layoutId="nav-indicator" className="rounded-full p-1" transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                  <Icon className="h-6 w-6 text-[#cc161c]" />
                </motion.div>
              ) : (
                <Icon className="h-6 w-6 text-[#737373]" />
              )}
              <span className={`text-xs ${active ? "text-[#cc161c] font-medium" : "text-[#737373]"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
