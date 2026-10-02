import { NextRequest, NextResponse } from "next/server";
import { sessions } from "@/lib/filedrop-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  const { id, rid } = await params;
  const session = sessions.get(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const slot = session.receivers.get(rid);
  if (!slot) return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
  return NextResponse.json({ offer: slot.offer, status: slot.status });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  const { id, rid } = await params;
  const session = sessions.get(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const slot = session.receivers.get(rid);
  if (!slot) return NextResponse.json({ error: "Receiver not found" }, { status: 404 });

  const body = await req.json();
  if (body.offer !== undefined) { slot.offer = body.offer; slot.status = "offer-sent"; }
  if (body.status !== undefined) { slot.status = body.status; }
  return NextResponse.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  const { id, rid } = await params;
  const session = sessions.get(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const slot = session.receivers.get(rid);
  if (!slot) return NextResponse.json({ error: "Receiver not found" }, { status: 404 });

  const body = await req.json();
  if (body.answer !== undefined) { slot.answer = body.answer; slot.status = "answered"; }
  return NextResponse.json({ ok: true });
}
