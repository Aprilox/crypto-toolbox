import { NextRequest, NextResponse } from "next/server";
import { sessions, generateId } from "@/lib/filedrop-store";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessions.get(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const receiverId = generateId();
  session.receivers.set(receiverId, {
    receiverId,
    offer: null,
    answer: null,
    status: "waiting",
    createdAt: Date.now(),
  });
  return NextResponse.json({ receiverId });
}
