import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Folder from "@/models/Folder";
import Note from "@/models/Note";
import { z } from "zod";

const createSchema = z.object({ title: z.string().min(1).max(200) });

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
  const notes = await Note.find({ folderId: id }).sort({ updatedAt: -1 }).lean();
  return NextResponse.json(notes);
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
  const note = await Note.create({
    folderId: id,
    userId: user._id,
    title: parsed.data.title,
    content: "",
  });
  return NextResponse.json(note);
}
