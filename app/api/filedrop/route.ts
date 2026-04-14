import { NextRequest, NextResponse } from "next/server";
import { sessions, cleanupOldSessions, generateId } from "@/lib/filedrop-store";

export async function POST(req: NextRequest) {
  cleanupOldSessions();
  const body = await req.json();
  const { fileName, fileSize, fileType } = body;
  const id = generateId();
  sessions.set(id, {
    id,
    fileName: String(fileName),
    fileSize: Number(fileSize),
    fileType: String(fileType || "application/octet-stream"),
    receivers: new Map(),
    createdAt: Date.now(),
  });
  return NextResponse.json({ id });
}
