import { NextRequest, NextResponse } from "next/server";
import { sessions } from "@/lib/filedrop-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessions.get(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({
    fileName: session.fileName,
    fileSize: session.fileSize,
    fileType: session.fileType,
    isDirectory: session.isDirectory,
  });
}
