import { NextRequest, NextResponse } from "next/server";
import { sessions } from "@/lib/filedrop-store";

// Receiver polls this for the sender's offer
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; rid: string } }
) {
  const session = sessions.get(params.id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const slot = session.receivers.get(params.rid);
  if (!slot) return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
  return NextResponse.json({ offer: slot.offer, status: slot.status });
}

// Sender pushes their offer for this receiver
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; rid: string } }
) {
  const session = sessions.get(params.id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const slot = session.receivers.get(params.rid);
  if (!slot) return NextResponse.json({ error: "Receiver not found" }, { status: 404 });

  const body = await req.json();
  if (body.offer !== undefined) { slot.offer = body.offer; slot.status = "offer-sent"; }
  if (body.status !== undefined) { slot.status = body.status; }
  return NextResponse.json({ ok: true });
}

// Receiver pushes their answer
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; rid: string } }
) {
  const session = sessions.get(params.id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const slot = session.receivers.get(params.rid);
  if (!slot) return NextResponse.json({ error: "Receiver not found" }, { status: 404 });

  const body = await req.json();
  if (body.answer !== undefined) { slot.answer = body.answer; slot.status = "answered"; }
  return NextResponse.json({ ok: true });
}
