import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Folder from "@/models/Folder";
import Table from "@/models/Table";
import { z } from "zod";

const createSchema = z.object({ name: z.string().min(1).max(100) });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { id } = await params;
  const folder = await Folder.findOne({ _id: id, userId: user._id });
  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  const tables = await Table.find({ folderId: id }).sort({ createdAt: -1 }).lean();
  return NextResponse.json(tables);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { id } = await params;
  const folder = await Folder.findOne({ _id: id, userId: user._id });
  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  const table = await Table.create({
    folderId: id,
    userId: user._id,
    name: parsed.data.name,
    columns: ["Column 1"],
    rows: [{}],
  });
  return NextResponse.json(table);
}
