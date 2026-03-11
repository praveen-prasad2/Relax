import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Table from "@/models/Table";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  columns: z.array(z.string()).optional(),
  rows: z.array(z.record(z.string(), z.unknown())).optional(),
});

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
  const table = await Table.findOne({ _id: id, userId: user._id }).lean();
  if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(table);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { id } = await params;
  const update: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.columns !== undefined) update.columns = parsed.data.columns;
  if (parsed.data.rows !== undefined) update.rows = parsed.data.rows;
  const table = await Table.findOneAndUpdate(
    { _id: id, userId: user._id },
    update,
    { new: true }
  );
  if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(table);
}
