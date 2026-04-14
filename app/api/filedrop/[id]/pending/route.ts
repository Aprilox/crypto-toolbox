import { NextRequest, NextResponse } from "next/server";
import { sessions } from "@/lib/filedrop-store";

// Sender polls this to learn about new receivers and pending answers
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = sessions.get(params.id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const slots = Array.from(session.receivers.values())
    .filter((s) => s.status !== "done" && s.status !== "cancelled")
    .map((s) => ({
      receiverId: s.receiverId,
      hasOffer: s.offer !== null,
      answer: s.status === "answered" ? s.answer : null,
      status: s.status,
    }));

  return NextResponse.json({ slots });
}
