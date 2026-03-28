import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BottomNavbar } from "@/components/BottomNavbar";
import { Header } from "@/components/Header";
import { MidnightRefresher } from "@/components/MidnightRefresher";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-white pb-20">
      <MidnightRefresher />
      <Header />
      <main className="mx-auto w-full max-w-lg md:max-w-none md:px-6">{children}</main>
      <BottomNavbar />
    </div>
  );
}
