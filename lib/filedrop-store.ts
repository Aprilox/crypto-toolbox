export interface ReceiverSlot {
  receiverId: string;
  offer: unknown | null;
  answer: unknown | null;
  status: "waiting" | "offer-sent" | "answered" | "done" | "cancelled";
  createdAt: number;
}

export interface FileDropSession {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  receivers: Map<string, ReceiverSlot>;
  createdAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __fileDropSessions: Map<string, FileDropSession> | undefined;
}

if (!global.__fileDropSessions) {
  global.__fileDropSessions = new Map<string, FileDropSession>();
}

export const sessions = global.__fileDropSessions!;

export function cleanupOldSessions(): void {
  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();
  sessions.forEach((session, id) => {
    if (now - session.createdAt > ONE_HOUR) sessions.delete(id);
  });
}

export function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}
