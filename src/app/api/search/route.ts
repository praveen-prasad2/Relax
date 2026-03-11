import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Folder from "@/models/Folder";
import Table from "@/models/Table";
import Note from "@/models/Note";
import Attendance from "@/models/Attendance";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ folders: [], tables: [], notes: [], attendance: [] });
  const regex = new RegExp(q, "i");
  const [folders, tables, notes, attendanceRaw] = await Promise.all([
    Folder.find({ userId: user._id, name: regex }).limit(10).lean(),
    Table.find({ userId: user._id, name: regex }).limit(10).lean(),
    Note.find({ userId: user._id, $or: [{ title: regex }, { content: regex }] }).limit(10).lean(),
    Attendance.find({ userId: user._id }).sort({ date: -1 }).limit(20).lean(),
  ]);
  const attFiltered = attendanceRaw.filter((a: { date: Date; dayName: string }) => {
    const d = new Date(a.date).toISOString().slice(0, 10);
    const day = a.dayName;
    return regex.test(d) || regex.test(day);
  });
  return NextResponse.json({
    folders,
    tables,
    notes,
    attendance: attFiltered.slice(0, 5),
  });
}
