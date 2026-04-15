/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import CopyButton from "@/app/components/CopyButton";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];
const CHUNK_SIZE = 256 * 1024; // 256 KB — optimal balance for WebRTC DataChannel throughput
const ICE_GATHER_TIMEOUT_MS = 8000;
const CONNECT_TIMEOUT_MS = 20000;

type PeerStatus = "pending" | "offer-sent" | "connecting" | "analyzing" | "transferring" | "done" | "error" | "cancelled";
type ReceiverStatus = "loading" | "ready" | "joining" | "connecting" | "analyzing" | "receiving" | "done" | "error" | "cancelled";

interface PeerEntry {
  receiverId: string;
  pc: RTCPeerConnection | null;
  progress: number;
  bytesSent: number;
  speed: number;      // bytes/sec upload speed
  lastTs: number;     // timestamp of last speed sample
  lastBytes: number;  // bytes at last speed sample
  status: PeerStatus;
  error: string;
  label: string;
}

interface SessionData { fileName: string; fileSize: number; fileType: string; isDirectory?: boolean; }

function formatBytes(b: number) {
  if (b === 0) return "0 B";
  const k = 1024, s = ["B", "KB", "MB", "GB", "TB"], i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + " " + s[i];
}

function formatSpeed(bps: number) {
  if (bps <= 0) return "";
  if (bps >= 1024 * 1024) return (bps / (1024 * 1024)).toFixed(1) + " MB/s";
  return (bps / 1024).toFixed(0) + " KB/s";
}

function sdpWithCandidates(sdp: string, candidates: RTCIceCandidateInit[]): string {
  if (!candidates.length) return sdp;
  const lines = sdp.split("\r\n"), result: string[] = [];
  let injected = false;
  for (const line of lines) {
    if (!injected && line === "a=end-of-candidates") {
      for (const c of candidates) result.push(`a=${c.candidate}`);
      injected = true;
    }
    result.push(line);
  }
  if (!injected) { for (const c of candidates) result.push(`a=${c.candidate}`); result.push("a=end-of-candidates"); }
  return result.join("\r\n");
}

function collectIceCandidates(pc: RTCPeerConnection, candidates: RTCIceCandidateInit[], timeoutMs = ICE_GATHER_TIMEOUT_MS): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const timer = setTimeout(finish, timeoutMs);
    pc.onicecandidate = (e) => { if (e.candidate) candidates.push(e.candidate.toJSON()); else { clearTimeout(timer); finish(); } };
  });
}

async function sendFileData(dc: RTCDataChannel, selected: { isDirectory: boolean; baseName: string; totalSize: number; files: File[] }, resumeMap: Record<number, number>, onProgress: (sentBytes: number) => void, onDone: () => void) {
  const BUFFER_HIGH = 4 * 1024 * 1024;
  const BUFFER_LOW  = 1 * 1024 * 1024;
  dc.bufferedAmountLowThreshold = BUFFER_LOW;

  let totalOffset = 0;
  for (let i = 0; i < selected.files.length; i++) {
    totalOffset += (resumeMap[i] || 0);
  }
  onProgress(totalOffset);

  const waitForDrain = () => new Promise<void>((resolve) => {
    const onLow = () => { dc.removeEventListener("bufferedamountlow", onLow); resolve(); };
    dc.addEventListener("bufferedamountlow", onLow);
  });

  for (let i = 0; i < selected.files.length; i++) {
    const file = selected.files[i];
    let fileOffset = resumeMap[i] || 0;

    if (file.size === 0) {
      if (fileOffset === 0 && dc.readyState === "open") dc.send(new ArrayBuffer(0));
      continue;
    }

    if (fileOffset >= file.size) continue;

    while (fileOffset < file.size) {
      if (dc.readyState !== "open") return;
      if (dc.bufferedAmount > BUFFER_HIGH) {
        await waitForDrain();
        if (dc.readyState !== "open") return;
      }
      const end = Math.min(fileOffset + CHUNK_SIZE, file.size);
      const buf = await file.slice(fileOffset, end).arrayBuffer();
      if (dc.readyState !== "open") return;
      dc.send(buf);
      fileOffset = end;
      totalOffset += buf.byteLength;
      onProgress(totalOffset);
    }
  }

  if (dc.readyState === "open") {
    dc.send(JSON.stringify({ type: "done" }));
    onDone();
  }
}

export default function FileDropClient() {
  const sessionId = useSearchParams().get("id");
  return sessionId ? <ReceiverView sessionId={sessionId} /> : <SenderView />;
}

// ============================= SENDER =============================

function SenderView() {
  const [selectedContent, setSelectedContent] = useState<{ isDirectory: boolean; baseName: string; totalSize: number; files: File[] } | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [peers, setPeers] = useState<PeerEntry[]>([]);

  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const processingRef = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const sessionIdRef = useRef("");
  const fileRef = useRef<{ isDirectory: boolean; baseName: string; totalSize: number; files: File[] } | null>(null);
  const peerCountRef = useRef(0);
  const lastSyncRef = useRef(0); // throttle UI updates

  useEffect(() => {
    mountedRef.current = true;
    const peers = peersRef.current;
    const poll = pollRef.current;
    return () => {
      mountedRef.current = false;
      if (poll) clearInterval(poll);
      peers.forEach((p) => { if (p.pc) p.pc.close(); });
    };
  }, []);

  const shareUrl = sessionId && typeof window !== "undefined"
    ? `${window.location.origin}/tools/filedrop?id=${sessionId}` : "";

  const sync = (force = false) => {
    const now = Date.now();
    if (!force && now - lastSyncRef.current < 250) return; // max 4 fps
    lastSyncRef.current = now;
    setPeers(Array.from(peersRef.current.values()).map(p => ({ ...p })));
  };

  const cancelPeer = async (receiverId: string) => {
    const peer = peersRef.current.get(receiverId);
    if (!peer || peer.status === "done" || peer.status === "cancelled") return;
    if (peer.pc) { peer.pc.close(); peer.pc = null; }
    peer.status = "cancelled";
    sync(true); // force immediate — bypasses 4fps throttle
    fetch(`/api/filedrop/${sessionIdRef.current}/receivers/${receiverId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    }).catch(() => {});
  };

  const resetAll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    const sid = sessionIdRef.current;
    // Mark all active receivers as cancelled so they see the right message
    peersRef.current.forEach((p) => {
      if (p.pc) p.pc.close();
      if (p.status !== "done" && p.status !== "cancelled") {
        fetch(`/api/filedrop/${sid}/receivers/${p.receiverId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled" }),
        }).catch(() => {});
      }
    });
    peersRef.current.clear(); processingRef.current.clear(); peerCountRef.current = 0;
    setPeers([]); setSessionId(""); sessionIdRef.current = "";
    setRunning(false); setSelectedContent(null); fileRef.current = null; setError("");
  };

  const createOfferForReceiver = async (receiverId: string) => {
    if (processingRef.current.has(receiverId)) return;
    processingRef.current.add(receiverId);

    const peer: PeerEntry = {
      receiverId, pc: null, progress: 0, bytesSent: 0, speed: 0,
      lastTs: Date.now(), lastBytes: 0,
      status: "pending", error: "",
      label: `Destinataire #${++peerCountRef.current}`,
    };
    peersRef.current.set(receiverId, peer);
    sync();

    const selected = fileRef.current!;
    const sid = sessionIdRef.current;

    try {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peer.pc = pc;

      const dc = pc.createDataChannel("filedrop", { ordered: true });
      dc.bufferedAmountLowThreshold = 1024 * 1024;
      dc.onopen = () => {
        if (!mountedRef.current) return;
        peer.status = "analyzing"; sync();

        if (selected.isDirectory || selected.files.length > 1) {
          const filesMeta = selected.files.map((f: any) => ({
            path: f.customPath || f.webkitRelativePath || f.name,
            size: f.size
          }));
          dc.send(JSON.stringify({ type: "meta_multi", isDirectory: true, name: selected.baseName, size: selected.totalSize, files: filesMeta }));
        } else {
          const file = selected.files[0];
          dc.send(JSON.stringify({ type: "meta", name: file.name, size: file.size, fileType: file.type || "application/octet-stream" }));
        }
        
        dc.onmessage = (ev) => {
            if (typeof ev.data === "string") {
                const msg = JSON.parse(ev.data);
                if (msg.type === "resume_request") {
                    if (!mountedRef.current) return;
                    peer.status = "transferring"; sync();
                    sendFileData(dc, selected, msg.map, () => {}, () => {});
                } else if (msg.type === "progress") {
                    if (!mountedRef.current) return;
                    const now = Date.now();
                    const dt = (now - peer.lastTs) / 1000;
                    if (dt >= 0.5) {
                        peer.speed = (msg.bytes - peer.lastBytes) / dt;
                        peer.lastBytes = msg.bytes;
                        peer.lastTs = now;
                    }
                    peer.progress = msg.bytes / selected.totalSize;
                    peer.bytesSent = msg.bytes;
                    sync();
                } else if (msg.type === "disk_done") {
                    if (!mountedRef.current) return;
                    peer.status = "done"; peer.progress = 1; sync(true);
                    fetch(`/api/filedrop/${sid}/receivers/${receiverId}`, {
                      method: "PUT", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "done" }),
                    }).catch(() => {});
                }
            }
        };
      };

      pc.oniceconnectionstatechange = () => {
        if (!mountedRef.current) return;
        if (pc.iceConnectionState === "failed") {
          peer.status = "error"; peer.error = "Connexion ICE échouée"; sync(true);
        }
      };

      const candidates: RTCIceCandidateInit[] = [];
      const gatheringDone = collectIceCandidates(pc, candidates);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await gatheringDone;
      if (!mountedRef.current) return;

      const baseSdp = pc.localDescription?.sdp ?? offer.sdp ?? "";
      const inSdp = (baseSdp.match(/a=candidate:/g) || []).length;
      if (inSdp === 0 && candidates.length === 0) {
        peer.status = "error"; peer.error = "Aucun candidat ICE (UDP bloqué ?)"; pc.close(); sync(true); return;
      }
      const finalSdp = inSdp > 0 ? baseSdp : sdpWithCandidates(baseSdp, candidates);

      await fetch(`/api/filedrop/${sid}/receivers/${receiverId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer: { type: "offer", sdp: finalSdp } }),
      });
      if (!mountedRef.current) return;
      peer.status = "offer-sent"; sync(true);

    } catch (err) {
      peer.status = "error"; peer.error = err instanceof Error ? err.message : "Erreur inconnue"; sync(true);
    }
  };

  const completeConnection = async (receiverId: string, answer: RTCSessionDescriptionInit) => {
    const peer = peersRef.current.get(receiverId);
    if (!peer || !peer.pc || peer.status !== "offer-sent") return;
    peer.status = "connecting"; sync();
    try {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      peer.status = "error"; peer.error = err instanceof Error ? err.message : "Erreur connexion"; sync();
    }
  };

  const startSharing = async () => {
    if (!selectedContent) return;
    fileRef.current = selectedContent;
    setRunning(true); setError("");
    try {
      const res = await fetch("/api/filedrop", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fileName: selectedContent.baseName, 
          fileSize: selectedContent.totalSize, 
          fileType: selectedContent.isDirectory ? "application/x-directory" : (selectedContent.files[0]?.type || "application/octet-stream"),
          isDirectory: selectedContent.isDirectory
        }),
      });
      const { id } = await res.json();
      if (!mountedRef.current) return;
      setSessionId(id); sessionIdRef.current = id;

      pollRef.current = setInterval(async () => {
        if (!mountedRef.current) return;
        try {
          const r = await fetch(`/api/filedrop/${id}/pending`);
          if (!r.ok) return;
          const { slots } = await r.json();
          for (const slot of slots) {
            const existingPeer = peersRef.current.get(slot.receiverId);
            if (slot.status === "cancelled" || slot.status === "error") {
               if (existingPeer && existingPeer.status !== slot.status) {
                 existingPeer.status = slot.status;
                 if (existingPeer.pc) { existingPeer.pc.close(); existingPeer.pc = null; }
                 sync();
               }
               continue;
            }
            if (!existingPeer && !processingRef.current.has(slot.receiverId)) {
              createOfferForReceiver(slot.receiverId);
            } else if (slot.answer && existingPeer?.status === "offer-sent") {
              completeConnection(slot.receiverId, slot.answer);
            }
          }
        } catch { /* ignore */ }
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setRunning(false);
    }
  };

  const activePeers = peers;
  const donePeers = peers.filter((p) => p.status === "done").length;

  const peerBadge: Record<PeerStatus, string> = {
    pending: "border-accent text-accent", "offer-sent": "border-accent text-accent",
    connecting: "border-accent text-accent", analyzing: "border-yellow-500 text-yellow-500",
    transferring: "border-accent text-accent",
    done: "border-green-500 text-green-500", error: "border-red-500 text-red-500",
    cancelled: "border-foreground/20 text-foreground/30",
  };
  const peerLabel: Record<PeerStatus, string> = {
    pending: "PRÉP.", "offer-sent": "ATTENTE", connecting: "CONNEXION", analyzing: "ANALYSE",
    transferring: "ENVOI", done: "TERMINÉ", error: "ERREUR", cancelled: "ANNULÉ",
  };

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-foreground/40 hover:text-foreground text-sm transition-colors">← Retour</Link>
          <h1 className="text-3xl font-bold mt-4 mb-2">
            <span className="text-foreground">📡 File</span><span className="text-accent">Drop</span>
          </h1>
          <p className="text-foreground/60">Partage P2P · Connexion directe entre navigateurs · Aucun serveur</p>
        </div>

        {!running && (
          <>
            <div
              onDrop={async (e) => {
                e.preventDefault();
                const items = e.dataTransfer.items;
                if (!items || items.length === 0) return;
                
                const fileEntries: File[] = [];
                let isDirectory = false;
                let baseName = "";

                const traverseFileTree = async (item: any, path: string = "") => {
                  if (item.isFile) {
                    const file = await new Promise<File>((resolve) => item.file(resolve));
                    Object.defineProperty(file, 'customPath', { value: path + file.name });
                    fileEntries.push(file);
                  } else if (item.isDirectory) {
                    isDirectory = true;
                    const dirReader = item.createReader();
                    const entries = await new Promise<any[]>((resolve) => {
                      const allEntries: any[] = [];
                      const readNext = () => {
                        dirReader.readEntries((batch: any[]) => {
                          if (batch.length > 0) { allEntries.push(...batch); readNext(); }
                          else { resolve(allEntries); }
                        });
                      };
                      readNext();
                    });
                    if (entries.length === 0) {
                        const emptyFolderMarker = new File([], item.name, { type: "application/x-empty-folder" });
                        Object.defineProperty(emptyFolderMarker, 'customPath', { value: path + item.name + "/" });
                        fileEntries.push(emptyFolderMarker);
                    } else {
                        for (const entry of entries) {
                          await traverseFileTree(entry, path + item.name + "/");
                        }
                    }
                  }
                };

                for (let i = 0; i < items.length; i++) {
                  const item = items[i].webkitGetAsEntry();
                  if (item) {
                     if (i === 0) baseName = item.name;
                     await traverseFileTree(item);
                  }
                }
                
                if (fileEntries.length > 0) {
                   if (fileEntries.length > 1 && !isDirectory) isDirectory = true; 
                   if (baseName === "" && isDirectory) baseName = "Fichiers";
                   if (!isDirectory) baseName = fileEntries[0].name;
                   const totalSize = fileEntries.reduce((acc, f) => acc + f.size, 0);
                   setSelectedContent({ isDirectory, baseName, totalSize, files: fileEntries });
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              className="card mb-6 flex flex-col items-center justify-center py-12 relative cursor-default"
            >
              <div className="text-5xl mb-4">📁</div>
              <p className="text-foreground/60 mb-6 text-center">Glissez vos fichiers ou dossiers ici</p>
              <div className="flex gap-4">
                <label className="btn btn-outline cursor-pointer text-sm">
                  Sélectionner fichier(s)
                  <input type="file" multiple className="hidden" onChange={(e) => {
                    const fileList = e.target.files;
                    if (!fileList || fileList.length === 0) return;
                    const fileEntries = Array.from(fileList);
                    const isDirectory = fileEntries.length > 1;
                    const baseName = isDirectory ? "Fichiers" : fileEntries[0].name;
                    const totalSize = fileEntries.reduce((acc, f) => acc + f.size, 0);
                    setSelectedContent({ isDirectory, baseName, totalSize, files: fileEntries });
                  }} />
                </label>
                <label className="btn btn-outline cursor-pointer text-sm">
                  Sélectionner dossier
                  <input type="file" {...({ webkitdirectory: "", directory: "" } as any)} className="hidden" onChange={(e) => {
                    const fileList = e.target.files;
                    if (!fileList || fileList.length === 0) return;
                    const fileEntries = Array.from(fileList);
                    fileEntries.forEach(f => {
                       Object.defineProperty(f, 'customPath', { value: f.webkitRelativePath });
                    });
                    const baseName = fileEntries[0].webkitRelativePath?.split('/')[0] || "Dossier";
                    const totalSize = fileEntries.reduce((acc, f) => acc + f.size, 0);
                    setSelectedContent({ isDirectory: true, baseName, totalSize, files: fileEntries });
                  }} />
                </label>
              </div>
            </div>
            {selectedContent && (
              <div className="card mb-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">{selectedContent.baseName}</p>
                    <p className="text-foreground/50 text-sm mt-1">
                      {selectedContent.isDirectory ? `Dossier/Multiple · ${selectedContent.files.filter(f => f.type !== "application/x-empty-folder").length} fichiers · ` : ""}
                      {formatBytes(selectedContent.totalSize)}
                    </p>
                  </div>
                  <button onClick={() => setSelectedContent(null)} className="text-foreground/40 hover:text-foreground text-xl ml-4">✕</button>
                </div>
              </div>
            )}
            {selectedContent && <button onClick={startSharing} className="btn btn-cyan w-full">Générer le lien de partage →</button>}
            {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
          </>
        )}

        {running && (
          <>
            {selectedContent && (
              <div className="card mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📁</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground truncate">{selectedContent.baseName}</p>
                    <p className="text-foreground/50 text-sm">{formatBytes(selectedContent.totalSize)}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded border border-accent text-accent shrink-0">PARTAGE</span>
                </div>
              </div>
            )}

            {shareUrl && (
              <div className="card mb-6">
                <h2 className="text-accent font-bold mb-3">Lien à envoyer</h2>
                <div className="terminal mb-3"><code className="text-sm break-all text-accent">{shareUrl}</code></div>
                <CopyButton text={shareUrl} className="w-full" />
                <p className="text-foreground/30 text-xs mt-3">⚠️ Gardez cet onglet ouvert pendant tous les transferts.</p>
              </div>
            )}

            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-accent font-bold">
                  Destinataires
                  {activePeers.length > 0 && (
                    <span className="ml-2 text-foreground/50 font-normal text-sm">
                      ({donePeers}/{activePeers.length} terminé{donePeers > 1 ? "s" : ""})
                    </span>
                  )}
                </h2>
              </div>

              {activePeers.length === 0 ? (
                <div className="terminal">
                  <div className="terminal-header">
                    <div className="terminal-dot red" /><div className="terminal-dot yellow" /><div className="terminal-dot green" />
                  </div>
                  <p className="text-foreground/70 text-sm">
                    <span className="text-accent">&gt;</span> En attente de destinataire(s)...<span className="cursor-blink" />
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activePeers.map((peer) => (
                    <div key={peer.receiverId} className="rounded-lg border border-border bg-card/30 p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg">👤</span>
                        <span className="font-bold text-foreground text-sm flex-1">{peer.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border shrink-0 ${peerBadge[peer.status]}`}>
                          {peerLabel[peer.status]}
                        </span>
                        {peer.status !== "done" && peer.status !== "error" && (
                          <button
                            onClick={() => cancelPeer(peer.receiverId)}
                            className="text-foreground/30 hover:text-red-400 transition-colors text-sm ml-1"
                            title="Annuler ce destinataire"
                          >✕</button>
                        )}
                      </div>

                      {(peer.status === "transferring" || peer.status === "done") && (
                        <>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mb-2">
                            <div
                              className={`h-full transition-all duration-200 ${peer.status === "done" ? "bg-green-500" : "bg-accent"}`}
                              style={{ width: `${peer.progress * 100}%` }}
                            />
                          </div>
                          {/* Fixed-width stats row — tabular-nums prevents jitter */}
                          <div className="flex items-center justify-between text-xs font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>
                            <span className="text-foreground/50 w-10 text-right">
                              {Math.round(peer.progress * 100)}%
                            </span>
                            <span className="text-foreground/30 mx-2">·</span>
                            <span className="text-foreground/40 w-28 text-right">
                              {formatBytes(peer.status === "done" ? selectedContent?.totalSize ?? peer.bytesSent : peer.bytesSent)}
                            </span>
                            <span className="text-foreground/20 mx-1">/</span>
                            <span className="text-foreground/30 w-24">
                              {formatBytes(selectedContent?.totalSize ?? 0)}
                            </span>
                            <span className="ml-auto text-accent/70 w-20 text-right">
                              {peer.speed > 0 && peer.status !== "done" ? `↑ ${formatSpeed(peer.speed)}` : ""}
                            </span>
                          </div>
                        </>
                      )}

                      {peer.status === "error" && (
                        <p className="text-red-400 text-xs mt-1">{peer.error}</p>
                      )}

                      {peer.status === "cancelled" && (
                        <p className="text-foreground/50 text-xs mt-1">Le destinataire a annulé la réception.</p>
                      )}

                      {(peer.status === "pending" || peer.status === "offer-sent") && (
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-accent/40 animate-pulse w-full" />
                        </div>
                      )}

                      {peer.status === "connecting" && (
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-accent/60 animate-pulse w-3/4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={resetAll}
              className="btn btn-red w-full transition-colors"
            >
              ✕ Arrêter tout le partage
            </button>
          </>
        )}

        <div className="mt-10 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ Comment ça marche</h3>
          <ul className="text-foreground/60 text-sm space-y-1">
            <li>• Partage natif de dossiers (arborescence conservée et fichiers vides gérés)</li>
            <li>• <strong className="text-green-400">Reprise & Auto-Réparation (Smart Resume)</strong> : en cas de coupure (ou de fichiers corrompus/incomplets), au rechargement de la page si le destinataire sélectionne le même dossier, l&apos;analyse P2P sautera ce qui est intact et remplacera précisément les morceaux manquants !</li>
            <li>• Connexion directe WebRTC DataChannel (aucun serveur intermédiaire)</li>
            <li>• Chaque destinataire utilise sa propre bande passante P2P</li>
            <li>• Gardez la page ouverte pendant tous les transferts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================= RECEIVER =============================

interface FSWritableStream { write(data: BufferSource): Promise<void>; close(): Promise<void>; abort(): Promise<void>; seek(position: number): Promise<void>; }
interface FSFileHandle { createWritable(options?: { keepExistingData?: boolean }): Promise<FSWritableStream>; remove?(): Promise<void>; getFile(): Promise<File>; }
interface FSDirHandle { getDirectoryHandle(name: string, options?: { create: boolean }): Promise<FSDirHandle>; getFileHandle(name: string, options?: { create: boolean }): Promise<FSFileHandle>; }
type ShowSaveFilePicker = (opts?: { suggestedName?: string }) => Promise<FSFileHandle>;
type ShowDirectoryPicker = (opts?: any) => Promise<FSDirHandle>;

function supportsStreamSave() { return typeof window !== "undefined" && "showSaveFilePicker" in window; }
function supportsDirSave() { return typeof window !== "undefined" && "showDirectoryPicker" in window; }

function ReceiverView({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<ReceiverStatus>("loading");
  const [session, setSession] = useState<SessionData | null>(null);
  const [progress, setProgress] = useState(0);
  const [receivedBytes, setReceivedBytes] = useState(0);
  const [speed, setSpeed] = useState(0); // bytes/sec download speed
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [streaming, setStreaming] = useState(false);

  const speedLastTsRef = useRef(Date.now());
  const speedLastBytesRef = useRef(0);
  const lastUiUpdateRef = useRef(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const receiverIdRef = useRef("");
  const connTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offerPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<ArrayBuffer[]>([]);
  const receivedSizeRef = useRef(0);
  const totalSizeRef = useRef(0);
  const mountedRef = useRef(true);
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());
  const writableRef = useRef<FSWritableStream | null>(null);
  const fileHandleRef = useRef<FSFileHandle | null>(null);
  const dirHandleRef = useRef<FSDirHandle | null>(null);
  const metaMultiRef = useRef<any>(null);
  const currentFileIndexRef = useRef(0);
  const currentFileBytesRef = useRef(0);
  const currentFileFailedRef = useRef(false);
  const statusRef = useRef<ReceiverStatus>("loading");
  const dirCacheRef = useRef<Map<string, FSDirHandle>>(new Map());
  const dcRef = useRef<RTCDataChannel | null>(null);
  const resumeMapRef = useRef<Record<number, number>>({});

  useEffect(() => {
    mountedRef.current = true;
    const pollRefCurrent = pollRef;
    const connTimeoutRefCurrent = connTimeoutRef;
    const offerPollRefCurrent = offerPollRef;
    const pcRefCurrent = pcRef;
    const writableRefCurrent = writableRef;
    const fileHandleRefCurrent = fileHandleRef;
    return () => {
      mountedRef.current = false;
      if (pollRefCurrent.current) clearInterval(pollRefCurrent.current);
      if (connTimeoutRefCurrent.current) clearTimeout(connTimeoutRefCurrent.current);
      if (offerPollRefCurrent.current) clearInterval(offerPollRefCurrent.current);
      if (pcRefCurrent.current) { pcRefCurrent.current.close(); pcRefCurrent.current = null; }
      const writable = writableRefCurrent.current; const handle = fileHandleRefCurrent.current;
      writableRefCurrent.current = null; fileHandleRefCurrent.current = null; dirHandleRef.current = null;
      if (writable) writable.abort().then(() => handle?.remove?.()).catch(() => handle?.remove?.().catch(() => {}));
    };
  }, []);

  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (statusRef.current !== "receiving") return;
      e.preventDefault(); e.returnValue = "Téléchargement en cours — quitter supprimera le fichier partiel.";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/filedrop/${sessionId}`);
        if (!mountedRef.current) return;
        if (!res.ok) throw new Error(res.status === 404 ? "Session introuvable ou expirée" : "Erreur serveur");
        const data: SessionData = await res.json();
        if (!mountedRef.current) return;
        setSession(data); setStatus("ready");
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err.message : "Erreur inconnue"); setStatus("error");
      }
    })();
  }, [sessionId]);

  const cancelReceiving = () => {
    if (offerPollRef.current) clearInterval(offerPollRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    if (connTimeoutRef.current) clearTimeout(connTimeoutRef.current);
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    const writable = writableRef.current; const handle = fileHandleRef.current;
    writableRef.current = null; fileHandleRef.current = null; dirHandleRef.current = null;
    dirCacheRef.current.clear();
    dcRef.current = null;
    if (writable) writable.abort().then(() => handle?.remove?.()).catch(() => handle?.remove?.().catch(() => {}));
    chunksRef.current = []; receivedSizeRef.current = 0;
    setProgress(0); setStatus("cancelled");
    statusRef.current = "cancelled";

    if (receiverIdRef.current) {
        fetch(`/api/filedrop/${sessionId}/receivers/${receiverIdRef.current}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "cancelled" }),
        }).catch(() => {});
    }
  };

  const startDownload = async () => {
    if (!session) return;

    // Step 1: open save dialog FIRST (user gesture context)
    let writable: FSWritableStream | null = null;
    let dirHandle: FSDirHandle | null = null;
    let useStreaming = false;
    
    if (session.isDirectory) {
      if (!supportsDirSave()) {
        setError("Votre navigateur ne supporte pas le téléchargement de dossiers natif. Utilisez Chrome ou Edge.");
        setStatus("error");
        return;
      }
      try {
        const picker = (window as unknown as { showDirectoryPicker: ShowDirectoryPicker }).showDirectoryPicker;
        dirHandle = await picker({ mode: "readwrite" });
        dirHandleRef.current = dirHandle;
        useStreaming = true;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        dirHandleRef.current = null; useStreaming = false;
      }
    } else {
      if (supportsStreamSave()) {
        try {
          const picker = (window as unknown as { showSaveFilePicker: ShowSaveFilePicker }).showSaveFilePicker;
          const handle = await picker({ suggestedName: session.fileName });
          fileHandleRef.current = handle;
          writable = await handle.createWritable();
          useStreaming = true;
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
          fileHandleRef.current = null; writable = null; useStreaming = false;
        }
      }
    }

    writableRef.current = writable;
    writeChainRef.current = Promise.resolve();
    chunksRef.current = []; receivedSizeRef.current = 0;
    totalSizeRef.current = session.fileSize;
    setStreaming(useStreaming);

    // Step 2: join to get receiverId
    setStatus("joining");
    let receiverId: string;
    try {
      const joinRes = await fetch(`/api/filedrop/${sessionId}/join`, { method: "POST" });
      if (!joinRes.ok) throw new Error("Impossible de rejoindre la session");
      ({ receiverId } = await joinRes.json());
      receiverIdRef.current = receiverId;
    } catch (err) {
      if (writable) { writable.abort().then(() => fileHandleRef.current?.remove?.()).catch(() => {}); }
      setError(err instanceof Error ? err.message : "Erreur inconnue"); setStatus("error"); return;
    }

    // Step 3: poll for sender's offer
    const offerTimeout = setTimeout(() => {
      if (!mountedRef.current || statusRef.current !== "joining") return;
      if (offerPollRef.current) clearInterval(offerPollRef.current);
      if (writable) { writable.abort().then(() => fileHandleRef.current?.remove?.()).catch(() => {}); }
      setError("L'expéditeur ne répond pas (timeout 60s)."); setStatus("error");
    }, 60000);

    offerPollRef.current = setInterval(async () => {
      if (!mountedRef.current) return;
      try {
        const r = await fetch(`/api/filedrop/${sessionId}/receivers/${receiverId}`);
        if (!r.ok) return;
        const data = await r.json();
        if (data.status === "cancelled") {
          clearInterval(offerPollRef.current!); clearTimeout(offerTimeout);
          if (writable) { writable.abort().then(() => fileHandleRef.current?.remove?.()).catch(() => {}); }
          setError("L'expéditeur a annulé le partage."); setStatus("error"); return;
        }
        if (data.offer) {
          clearInterval(offerPollRef.current!); clearTimeout(offerTimeout);
          doConnect(receiverId, data.offer, writable, useStreaming, session);
        }
      } catch { /* ignore */ }
    }, 1000);
  };

  const doConnect = async (
    receiverId: string, offer: RTCSessionDescriptionInit,
    writable: FSWritableStream | null, useStreaming: boolean, capturedSession: SessionData
  ) => {
    setStatus("connecting");
    try {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      // Check API slot status to distinguish sender cancel vs network error
      const handleDisconnect = async (fallbackMsg: string) => {
        if (!mountedRef.current) return;
        if (writableRef.current) writableRef.current.abort().catch(() => {});
        try {
          const r = await fetch(`/api/filedrop/${sessionId}/receivers/${receiverId}`);
          if (r.ok) {
            const d = await r.json();
            if (d.status === "cancelled") {
              if (mountedRef.current) { setError("L'expéditeur a annulé le partage."); setStatus("error"); }
              return;
            }
          }
        } catch { /* ignore */ }
        if (mountedRef.current) { setError(fallbackMsg); setStatus("error"); }
      };

      pc.ondatachannel = (e) => {
        const dc = e.channel; dc.binaryType = "arraybuffer";
        dcRef.current = dc;
        if (connTimeoutRef.current) clearTimeout(connTimeoutRef.current);

        dc.onmessage = (ev) => {
          if (typeof ev.data === "string") {
            const msg = JSON.parse(ev.data);
            if (msg.type === "meta") {
              totalSizeRef.current = msg.size;
              if (mountedRef.current) setStatus("analyzing");
              
              const buildResume = async () => {
                const map: Record<number, number> = {};
                if (fileHandleRef.current) {
                   try { const f = await fileHandleRef.current.getFile(); if (f.size <= msg.size) map[0] = f.size; } catch {}
                }
                resumeMapRef.current = map;
                if (mountedRef.current && statusRef.current !== "cancelled") {
                  setStatus("receiving");
                  dc.send(JSON.stringify({ type: "resume_request", map }));
                }
              };
              buildResume();

            } else if (msg.type === "meta_multi") {
              totalSizeRef.current = msg.size;
              metaMultiRef.current = msg;
              if (mountedRef.current) setStatus("analyzing");

              const buildResume = async () => {
                const map: Record<number, number> = {};
                if (dirHandleRef.current && useStreaming) {
                  for (let i = 0; i < msg.files.length; i++) {
                    if (statusRef.current === "cancelled") return;
                    const fMeta = msg.files[i];
                    if (fMeta.size === 0) continue;
                    try {
                      const parts = fMeta.path.split('/');
                      let cDir = dirHandleRef.current;
                      if (!(parts.length > 1 && parts[0] === capturedSession.fileName)) {
                         try { cDir = await cDir.getDirectoryHandle(capturedSession.fileName, { create: false }); } catch { continue; }
                      }
                      let found = true;
                      for (let j = 0; j < parts.length - 1; j++) {
                        try { cDir = await cDir.getDirectoryHandle(parts[j], { create: false }); } catch { found = false; break; }
                      }
                      if (found && parts[parts.length - 1] !== "") {
                        const fh = await cDir.getFileHandle(parts[parts.length - 1], { create: false });
                        const f = await fh.getFile();
                        if (f.size <= fMeta.size) map[i] = f.size;
                      }
                    } catch {}
                  }
                }
                
                let initIdx = 0;
                while (initIdx < msg.files.length) {
                   if (msg.files[initIdx].size !== 0 && map[initIdx] === msg.files[initIdx].size) initIdx++;
                   else break;
                }
                currentFileIndexRef.current = initIdx;
                currentFileBytesRef.current = map[initIdx] || 0;
                
                let receivedSoFar = 0;
                for (let i = 0; i < msg.files.length; i++) receivedSoFar += (map[i] || 0);
                receivedSizeRef.current = receivedSoFar;
                
                resumeMapRef.current = map;
                if (mountedRef.current && statusRef.current !== "cancelled") {
                  setStatus("receiving");
                  dc.send(JSON.stringify({ type: "resume_request", map }));
                }
              };
              buildResume();

            } else if (msg.type === "done") {
              writeChainRef.current = writeChainRef.current.then(async () => {
                if (statusRef.current === "cancelled") return;
                if (writableRef.current) {
                  const w = writableRef.current;
                  writableRef.current = null;
                  if (!(window as any).__pendingCloses) (window as any).__pendingCloses = [];
                  (window as any).__pendingCloses.push(w.close().catch(() => {}));
                }
                
                if ((window as any).__pendingCloses) {
                   await Promise.all((window as any).__pendingCloses);
                   (window as any).__pendingCloses = [];
                }

                if (writableRef.current || (metaMultiRef.current && capturedSession.isDirectory && useStreaming)) {
                  if (mountedRef.current) {
                      setReceivedBytes(totalSizeRef.current || capturedSession.fileSize);
                      setSpeed(0);
                      setProgress(1);
                      setStatus("done");
                      if (dcRef.current?.readyState === "open") dcRef.current.send(JSON.stringify({ type: "disk_done" }));
                  }
                } else {
                  const blob = new Blob(chunksRef.current, { type: capturedSession.fileType || "application/octet-stream" });
                  const url = URL.createObjectURL(blob);
                  chunksRef.current = [];
                  if (mountedRef.current) {
                      setDownloadUrl(url);
                      setReceivedBytes(totalSizeRef.current || capturedSession.fileSize);
                      setSpeed(0);
                      setProgress(1);
                      setStatus("done");
                      if (dcRef.current?.readyState === "open") dcRef.current.send(JSON.stringify({ type: "disk_done" }));
                  }
                }
              }).catch(() => {});
            }
          } else if (ev.data instanceof ArrayBuffer) {
            const chunk = ev.data as ArrayBuffer;
            const total = totalSizeRef.current || capturedSession.fileSize;
            
            const updateProgressUI = () => {
                receivedSizeRef.current += chunk.byteLength;
                if (mountedRef.current) {
                  const now = Date.now();
                  if (now - lastUiUpdateRef.current >= 250) {
                    lastUiUpdateRef.current = now;
                    const dt = (now - speedLastTsRef.current) / 1000;
                    if (dt >= 0.5) {
                      setSpeed((receivedSizeRef.current - speedLastBytesRef.current) / dt);
                      speedLastTsRef.current = now;
                      speedLastBytesRef.current = receivedSizeRef.current;
                    }
                    setReceivedBytes(receivedSizeRef.current);
                    setProgress(receivedSizeRef.current / total);
                    if (dcRef.current?.readyState === "open") {
                        dcRef.current.send(JSON.stringify({ type: "progress", bytes: receivedSizeRef.current }));
                    }
                  }
                }
            };
            
            if (metaMultiRef.current && capturedSession.isDirectory) {
               const meta = metaMultiRef.current;
               writeChainRef.current = writeChainRef.current.then(async () => {
                  if (statusRef.current === "cancelled") return;
                  const currentIdx = currentFileIndexRef.current;
                  if (currentIdx >= meta.files.length) return;
                  const fileMeta = meta.files[currentIdx];
                  
                  if (!writableRef.current && dirHandleRef.current && !currentFileFailedRef.current) {
                     try {
                         const pathParts = fileMeta.path.split('/');
                         let currentDir = dirHandleRef.current;
                         let cachePath = "";
                         
                         if (!(pathParts.length > 1 && pathParts[0] === capturedSession.fileName)) {
                             cachePath = capturedSession.fileName;
                             if (dirCacheRef.current.has(cachePath)) {
                                 currentDir = dirCacheRef.current.get(cachePath)!;
                             } else {
                                 currentDir = await currentDir.getDirectoryHandle(capturedSession.fileName, { create: true });
                                 dirCacheRef.current.set(cachePath, currentDir);
                             }
                         }
                         
                         for (let i = 0; i < pathParts.length - 1; i++) {
                             cachePath += (cachePath ? "/" : "") + pathParts[i];
                             if (dirCacheRef.current.has(cachePath)) {
                                 currentDir = dirCacheRef.current.get(cachePath)!;
                             } else {
                                 currentDir = await currentDir.getDirectoryHandle(pathParts[i], { create: true });
                                 dirCacheRef.current.set(cachePath, currentDir);
                             }
                         }
                         
                         const lastPart = pathParts[pathParts.length - 1];
                         if (lastPart !== "") {
                             const handle = await currentDir.getFileHandle(lastPart, { create: true });
                             const existingBytes = resumeMapRef.current[currentIdx] || 0;
                             writableRef.current = await handle.createWritable({ keepExistingData: true });
                             if (existingBytes > 0) {
                                 await writableRef.current.seek(existingBytes);
                             }
                         }
                     } catch(e) {
                         console.warn("Skipping file (fs error):", fileMeta.path, e);
                         currentFileFailedRef.current = true;
                     }
                  }
                  
                  if (writableRef.current && !currentFileFailedRef.current) {
                     try { await writableRef.current.write(chunk); }
                     catch(e) { console.error("Write error:", e); currentFileFailedRef.current = true; }
                  }
                  
                  currentFileBytesRef.current += chunk.byteLength;
                  updateProgressUI();
                  if (currentFileBytesRef.current >= fileMeta.size) { // >= to be safe
                     if (writableRef.current) {
                        const w = writableRef.current;
                        writableRef.current = null;
                        if (!(window as any).__pendingCloses) (window as any).__pendingCloses = [];
                        (window as any).__pendingCloses.push(w.close().catch(()=>{}));
                     }
                     currentFileFailedRef.current = false;
                     
                     let nextIdx = currentIdx + 1;
                     while (nextIdx < meta.files.length) {
                        const nMeta = meta.files[nextIdx];
                        if (nMeta.size !== 0 && resumeMapRef.current[nextIdx] === nMeta.size) { nextIdx++; continue; }
                        break;
                     }
                     
                     currentFileIndexRef.current = nextIdx;
                     currentFileBytesRef.current = resumeMapRef.current[nextIdx] || 0;
                  }
               }).catch(e => { console.error("Stream sync error:", e); });
            } else {
              if (writableRef.current) {
                writeChainRef.current = writeChainRef.current.then(async () => {
                    if (statusRef.current === "cancelled") return;
                    await writableRef.current!.write(chunk);
                    updateProgressUI();
                }).catch(() => {});
              } else { 
                chunksRef.current.push(chunk); 
                updateProgressUI();
              }
            }
          }
        };
        dc.onerror = () => handleDisconnect("Erreur de canal de données");
        dc.onclose = () => {
          if (mountedRef.current && statusRef.current !== "done" && statusRef.current !== "cancelled") {
            handleDisconnect("Connexion interrompue par l'expéditeur");
          }
        };
      };

      pc.oniceconnectionstatechange = () => {
        if (!mountedRef.current) return;
        const s = pc.iceConnectionState;
        if (s === "failed") {
          if (connTimeoutRef.current) clearTimeout(connTimeoutRef.current);
          handleDisconnect("Connexion ICE échouée.");
        } else if ((s === "disconnected" || s === "closed") && statusRef.current === "receiving") {
          if (connTimeoutRef.current) clearTimeout(connTimeoutRef.current);
          handleDisconnect("La connexion a été interrompue.");
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const candidates: RTCIceCandidateInit[] = [];
      const gatheringDone = collectIceCandidates(pc, candidates);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await gatheringDone;
      if (!mountedRef.current) return;

      const baseSdp = pc.localDescription?.sdp ?? answer.sdp ?? "";
      const inSdp = (baseSdp.match(/a=candidate:/g) || []).length;
      if (inSdp === 0 && candidates.length === 0) {
        if (writableRef.current) writableRef.current.abort().catch(() => {});
        setError("Aucun candidat ICE. UDP peut être bloqué."); setStatus("error"); pc.close(); return;
      }
      const finalSdp = inSdp > 0 ? baseSdp : sdpWithCandidates(baseSdp, candidates);

      await fetch(`/api/filedrop/${sessionId}/receivers/${receiverId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: { type: "answer", sdp: finalSdp } }),
      });

      connTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        const s = pcRef.current?.iceConnectionState;
        if (s !== "connected" && s !== "completed") {
          if (writableRef.current) writableRef.current.abort().catch(() => {});
          setError(`Délai dépassé (${CONNECT_TIMEOUT_MS / 1000}s). L'expéditeur est peut-être hors ligne.`);
          setStatus("error");
        }
      }, CONNECT_TIMEOUT_MS);

    } catch (err) {
      if (writableRef.current) writableRef.current.abort().catch(() => {});
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Erreur inconnue"); setStatus("error");
    }
  };

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <a href="/tools/filedrop" className="text-foreground/40 hover:text-foreground text-sm transition-colors">← Partager un fichier</a>
          <h1 className="text-3xl font-bold mt-4 mb-2">
            <span className="text-foreground">📡 File</span><span className="text-accent">Drop</span>
          </h1>
          <p className="text-foreground/60">Réception de fichier pair-à-pair</p>
        </div>

        {status === "loading" && (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4 animate-pulse">📡</div>
            <p className="text-foreground/60">Recherche de la session...</p>
            <p className="text-foreground/30 text-xs mt-2 font-mono">{sessionId}</p>
          </div>
        )}

        {status === "ready" && session && (
          <>
            <div className="card mb-6">
              <h2 className="text-accent font-bold mb-4">Fichier disponible</h2>
              <div className="flex items-center gap-4">
                <span className="text-5xl">📁</span>
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-lg truncate">{session.fileName}</p>
                  <p className="text-foreground/50 text-sm mt-1">{formatBytes(session.fileSize)}</p>
                  {session.fileType && session.fileType !== "application/octet-stream" && (
                    <p className="text-foreground/30 text-xs mt-1">{session.fileType}</p>
                  )}
                </div>
              </div>
            </div>
            <button onClick={startDownload} className="btn btn-cyan w-full">
              {(session.isDirectory ? supportsDirSave() : supportsStreamSave()) ? "Choisir l'emplacement et télécharger →" : "Démarrer le téléchargement →"}
            </button>
            {!(session.isDirectory ? supportsDirSave() : supportsStreamSave()) && (
              <p className="text-foreground/30 text-xs mt-3 text-center">
                ⚠️ Votre navigateur ne supporte pas l&apos;écriture streaming — le fichier sera chargé en mémoire.
              </p>
            )}
          </>
        )}

        {status === "joining" && (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4 animate-pulse">🔗</div>
            <p className="text-accent">Connexion à l&apos;expéditeur...</p>
            <p className="text-foreground/40 text-sm mt-2">En attente que l&apos;expéditeur configure votre connexion</p>
          </div>
        )}

        {status === "connecting" && (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4 animate-pulse">🔗</div>
            <p className="text-accent">Connexion au pair...</p>
            <p className="text-foreground/40 text-sm mt-2">Collecte des candidats réseau (max {ICE_GATHER_TIMEOUT_MS / 1000}s)</p>
          </div>
        )}

        {(status === "receiving" || status === "analyzing" || status === "done") && session && (
          <>
            <div className="card mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📁</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground truncate">{session.fileName}</p>
                  <p className="text-foreground/50 text-sm">{formatBytes(session.fileSize)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded border shrink-0 ${status === "done" ? "border-green-500 text-green-500" : (status === "analyzing" ? "border-yellow-500 text-yellow-500" : "border-accent text-accent")}`}>
                  {status === "done" ? "TERMINÉ" : status === "analyzing" ? "ANALYSE..." : streaming ? "ÉCRITURE" : "RÉCEPTION"}
                </span>
              </div>
            </div>

            <div className="card mb-6">
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-3">
                <div className="h-full bg-accent transition-all duration-200" style={{ width: `${progress * 100}%` }} />
              </div>
              {/* Fixed-width stats — tabular-nums prevents number jitter */}
              <div className="flex items-center text-xs font-mono gap-2" style={{ fontVariantNumeric: "tabular-nums" }}>
                <span className="text-foreground/50 w-10 text-right shrink-0">
                  {Math.round(progress * 100)}%
                </span>
                <span className="text-foreground/20">·</span>
                <span className="text-foreground/40 w-28 text-right shrink-0">
                  {formatBytes(receivedBytes)}
                </span>
                <span className="text-foreground/20">/</span>
                <span className="text-foreground/30 w-24 shrink-0">
                  {formatBytes(session.fileSize)}
                </span>
                {speed > 0 && (
                  <span className="ml-auto text-accent/70 w-20 text-right shrink-0">
                    ↓ {formatSpeed(speed)}
                  </span>
                )}
              </div>
              {streaming && status === "receiving" && (
                <p className="text-foreground/30 text-xs mt-2">Écriture directe sur disque — aucun stockage en mémoire</p>
              )}
            </div>

            {status === "receiving" && (
              <button onClick={cancelReceiving} className="btn btn-red w-full mb-4 transition-colors">
                ✕ Annuler le téléchargement{(streaming && !session.isDirectory) ? " (supprime le fichier partiel)" : ""}
              </button>
            )}

            {status === "done" && streaming && (
              <div className="card text-center py-4">
                <p className="text-green-400 font-bold">{session.isDirectory ? "Dossier sauvegardé ✓" : "Fichier sauvegardé ✓"}</p>
                <p className="text-foreground/40 text-sm mt-1">{session.isDirectory ? "Le dossier a été écrit" : "Le fichier a été écrit"} directement sur votre disque.</p>
              </div>
            )}
            {status === "done" && !streaming && downloadUrl && (
              <a href={downloadUrl} download={session.fileName} className="btn btn-cyan w-full text-center block">
                ↓ Sauvegarder {session.fileName}
              </a>
            )}
          </>
        )}

        {status === "cancelled" && (
          <div className="card mb-6">
            <div className="terminal">
              <div className="terminal-header">
                <div className="terminal-dot red" /><div className="terminal-dot yellow" /><div className="terminal-dot green" />
              </div>
              <p className="text-foreground/60 text-sm">&gt; Téléchargement annulé{(streaming && !session?.isDirectory) ? " — fichier partiel supprimé" : ""}</p>
            </div>
            <a href="/tools/filedrop" className="btn mt-4 w-full text-center block">Retour</a>
          </div>
        )}

        {status === "error" && (
          <div className="card mb-6">
            <div className="terminal">
              <div className="terminal-header">
                <div className="terminal-dot red" /><div className="terminal-dot yellow" /><div className="terminal-dot green" />
              </div>
              <p className="text-red-400 text-sm break-words">&gt; {error}</p>
            </div>
            <a href="/tools/filedrop" className="btn mt-4 w-full text-center block">Retour</a>
          </div>
        )}

        <div className="mt-10 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ Comment ça marche</h3>
          <ul className="text-foreground/60 text-sm space-y-2">
            <li>• 📂 <strong>Dossiers complets</strong> : téléchargez des centaines de fichiers dans leur arborescence exacte sans limite de poids.</li>
            <li>• ⚡ <strong className="text-green-400">Reprise & Auto-Réparation (Smart Resume)</strong> : si un transfert est interrompu et crée des fichiers partiels ou corrompus, rafraîchissez la page et sélectionnez <strong>le même dossier cible</strong>. L&apos;application va scanner intelligemment tous vos fichiers, ignorer ceux qui sont parfaits, et écraser/réparer chirurgicalement les fichiers corrompus pour reprendre où elle s&apos;était arrêtée !</li>
            <li>• Le fichier vient directement du PC de l&apos;expéditeur à la vitesse maximale de vos connexions.</li>
            <li>• <span className="text-accent">Chrome/Edge/Opera</span> : écriture disque directe en fil de l&apos;eau, ce qui permet de transférer 500 Go sans bloquer la mémoire.</li>
            <li>• L&apos;expéditeur doit absolument rester en ligne pendant tout le transfert.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
