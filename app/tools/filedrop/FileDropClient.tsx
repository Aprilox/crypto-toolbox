"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import CopyButton from "@/app/components/CopyButton";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];
const CHUNK_SIZE = 64 * 1024;
const ICE_GATHER_TIMEOUT_MS = 8000;
const CONNECT_TIMEOUT_MS = 20000;

type PeerStatus = "pending" | "offer-sent" | "connecting" | "transferring" | "done" | "error" | "cancelled";
type ReceiverStatus = "loading" | "ready" | "joining" | "connecting" | "receiving" | "done" | "error" | "cancelled";

interface PeerEntry {
  receiverId: string;
  pc: RTCPeerConnection | null;
  progress: number;
  status: PeerStatus;
  error: string;
  label: string;
}

interface SessionData { fileName: string; fileSize: number; fileType: string; }

function formatBytes(b: number) {
  if (b === 0) return "0 B";
  const k = 1024, s = ["B", "KB", "MB", "GB", "TB"], i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + " " + s[i];
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

async function sendFileData(dc: RTCDataChannel, file: File, onProgress: (p: number) => void, onDone: () => void) {
  dc.send(JSON.stringify({ type: "meta", name: file.name, size: file.size, fileType: file.type || "application/octet-stream" }));
  let offset = 0;
  const next = async (): Promise<void> => {
    if (dc.readyState !== "open") return;
    if (offset >= file.size) { dc.send(JSON.stringify({ type: "done" })); onDone(); return; }
    if (dc.bufferedAmount > 2 * 1024 * 1024) {
      await new Promise<void>((r) => { dc.onbufferedamountlow = () => { dc.onbufferedamountlow = null; r(); }; });
    }
    if (dc.readyState !== "open") return;
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    const buf = await file.slice(offset, end).arrayBuffer();
    if (dc.readyState !== "open") return;
    dc.send(buf); offset = end; onProgress(offset / file.size);
    setTimeout(next, 0);
  };
  next().catch(() => {});
}

export default function FileDropClient() {
  const sessionId = useSearchParams().get("id");
  return sessionId ? <ReceiverView sessionId={sessionId} /> : <SenderView />;
}

// ============================= SENDER =============================

function SenderView() {
  const [file, setFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [peers, setPeers] = useState<PeerEntry[]>([]);

  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const processingRef = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const sessionIdRef = useRef("");
  const fileRef = useRef<File | null>(null);
  const peerCountRef = useRef(0);

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

  const sync = () => setPeers(Array.from(peersRef.current.values()));

  const cancelPeer = async (receiverId: string) => {
    const peer = peersRef.current.get(receiverId);
    if (!peer || peer.status === "done" || peer.status === "cancelled") return;
    if (peer.pc) { peer.pc.close(); peer.pc = null; }
    peer.status = "cancelled";
    sync();
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
    setRunning(false); setFile(null); fileRef.current = null; setError("");
  };

  const createOfferForReceiver = async (receiverId: string) => {
    if (processingRef.current.has(receiverId)) return;
    processingRef.current.add(receiverId);

    const peer: PeerEntry = {
      receiverId, pc: null, progress: 0, status: "pending", error: "",
      label: `Destinataire #${++peerCountRef.current}`,
    };
    peersRef.current.set(receiverId, peer);
    sync();

    const file = fileRef.current!;
    const sid = sessionIdRef.current;

    try {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peer.pc = pc;

      const dc = pc.createDataChannel("filedrop", { ordered: true });
      dc.bufferedAmountLowThreshold = 1024 * 1024;
      dc.onopen = () => {
        if (!mountedRef.current) return;
        peer.status = "transferring"; sync();
        sendFileData(dc, file,
          (p) => { if (!mountedRef.current) return; peer.progress = p; sync(); },
          () => {
            if (!mountedRef.current) return;
            peer.status = "done"; peer.progress = 1; sync();
            fetch(`/api/filedrop/${sid}/receivers/${receiverId}`, {
              method: "PUT", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "done" }),
            }).catch(() => {});
          }
        );
      };

      pc.oniceconnectionstatechange = () => {
        if (!mountedRef.current) return;
        if (pc.iceConnectionState === "failed") {
          peer.status = "error"; peer.error = "Connexion ICE échouée"; sync();
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
        peer.status = "error"; peer.error = "Aucun candidat ICE (UDP bloqué ?)"; pc.close(); sync(); return;
      }
      const finalSdp = inSdp > 0 ? baseSdp : sdpWithCandidates(baseSdp, candidates);

      await fetch(`/api/filedrop/${sid}/receivers/${receiverId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer: { type: "offer", sdp: finalSdp } }),
      });
      if (!mountedRef.current) return;
      peer.status = "offer-sent"; sync();

    } catch (err) {
      peer.status = "error"; peer.error = err instanceof Error ? err.message : "Erreur inconnue"; sync();
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
    if (!file) return;
    fileRef.current = file;
    setRunning(true); setError("");
    try {
      const res = await fetch("/api/filedrop", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, fileType: file.type || "application/octet-stream" }),
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
            if (!peersRef.current.has(slot.receiverId) && !processingRef.current.has(slot.receiverId)) {
              createOfferForReceiver(slot.receiverId);
            } else if (slot.answer) {
              const peer = peersRef.current.get(slot.receiverId);
              if (peer?.status === "offer-sent") completeConnection(slot.receiverId, slot.answer);
            }
          }
        } catch { /* ignore */ }
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setRunning(false);
    }
  };

  const activePeers = peers.filter((p) => p.status !== "cancelled");
  const donePeers = peers.filter((p) => p.status === "done").length;

  const peerBadge: Record<PeerStatus, string> = {
    pending: "border-accent text-accent", "offer-sent": "border-accent text-accent",
    connecting: "border-accent text-accent", transferring: "border-accent text-accent",
    done: "border-green-500 text-green-500", error: "border-red-500 text-red-500",
    cancelled: "border-foreground/20 text-foreground/30",
  };
  const peerLabel: Record<PeerStatus, string> = {
    pending: "PRÉP.", "offer-sent": "ATTENTE", connecting: "CONNEXION",
    transferring: "ENVOI", done: "TERMINÉ", error: "ERREUR", cancelled: "ANNULÉ",
  };

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <a href="/" className="text-foreground/40 hover:text-foreground text-sm transition-colors">← Retour</a>
          <h1 className="text-3xl font-bold mt-4 mb-2">
            <span className="text-foreground">📡 File</span><span className="text-accent">Drop</span>
          </h1>
          <p className="text-foreground/60">Partage P2P · Connexion directe entre navigateurs · Aucun serveur</p>
        </div>

        {!running && (
          <>
            <div
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
              onDragOver={(e) => e.preventDefault()}
              className="card mb-6 cursor-pointer"
            >
              <label className="cursor-pointer block">
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📁</div>
                  <p className="text-foreground/60 mb-2">Glissez un fichier ici ou <span className="text-accent underline">cliquez pour sélectionner</span></p>
                  <p className="text-foreground/30 text-sm">Tous types de fichiers</p>
                </div>
              </label>
            </div>
            {file && (
              <div className="card mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground truncate max-w-xs">{file.name}</p>
                    <p className="text-foreground/50 text-sm mt-1">{formatBytes(file.size)}{file.type ? ` · ${file.type}` : ""}</p>
                  </div>
                  <button onClick={() => setFile(null)} className="text-foreground/40 hover:text-foreground text-xl ml-4">✕</button>
                </div>
              </div>
            )}
            {file && <button onClick={startSharing} className="btn btn-cyan w-full">Générer le lien de partage →</button>}
            {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
          </>
        )}

        {running && (
          <>
            {file && (
              <div className="card mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📁</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground truncate">{file.name}</p>
                    <p className="text-foreground/50 text-sm">{formatBytes(file.size)}</p>
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
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mb-1">
                            <div
                              className={`h-full transition-all duration-200 ${peer.status === "done" ? "bg-green-500" : "bg-accent"}`}
                              style={{ width: `${peer.progress * 100}%` }}
                            />
                          </div>
                          <p className="text-foreground/40 text-xs text-right">
                            {Math.round(peer.progress * 100)}% · {formatBytes(peer.progress * (file?.size ?? 0))} / {formatBytes(file?.size ?? 0)}
                          </p>
                        </>
                      )}

                      {peer.status === "error" && (
                        <p className="text-red-400 text-xs mt-1">{peer.error}</p>
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
              className="btn w-full border border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 transition-colors"
            >
              ✕ Arrêter tout le partage
            </button>
          </>
        )}

        <div className="mt-10 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ Comment ça marche</h3>
          <ul className="text-foreground/60 text-sm space-y-1">
            <li>• Connexion directe WebRTC DataChannel — fichier jamais uploadé</li>
            <li>• Chaque destinataire reçoit sa propre connexion P2P</li>
            <li>• Gardez la page ouverte pendant tous les transferts</li>
            <li>• Problème de connexion ? Vérifiez le pare-feu Windows (UDP doit être autorisé)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================= RECEIVER =============================

interface FSWritableStream { write(data: BufferSource): Promise<void>; close(): Promise<void>; abort(): Promise<void>; }
interface FSFileHandle { createWritable(): Promise<FSWritableStream>; remove?(): Promise<void>; }
type ShowSaveFilePicker = (opts?: { suggestedName?: string }) => Promise<FSFileHandle>;

function supportsStreamSave() { return typeof window !== "undefined" && "showSaveFilePicker" in window; }

function ReceiverView({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<ReceiverStatus>("loading");
  const [session, setSession] = useState<SessionData | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [streaming, setStreaming] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offerPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<ArrayBuffer[]>([]);
  const receivedSizeRef = useRef(0);
  const totalSizeRef = useRef(0);
  const mountedRef = useRef(true);
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());
  const writableRef = useRef<FSWritableStream | null>(null);
  const fileHandleRef = useRef<FSFileHandle | null>(null);
  const statusRef = useRef<ReceiverStatus>("loading");

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
      writableRefCurrent.current = null; fileHandleRefCurrent.current = null;
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
    writableRef.current = null; fileHandleRef.current = null;
    if (writable) writable.abort().then(() => handle?.remove?.()).catch(() => handle?.remove?.().catch(() => {}));
    chunksRef.current = []; receivedSizeRef.current = 0;
    setProgress(0); setStatus("cancelled");
  };

  const startDownload = async () => {
    if (!session) return;

    // Step 1: open save dialog FIRST (user gesture context)
    let writable: FSWritableStream | null = null;
    let useStreaming = false;
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
        if (connTimeoutRef.current) clearTimeout(connTimeoutRef.current);

        dc.onmessage = (ev) => {
          if (typeof ev.data === "string") {
            const msg = JSON.parse(ev.data);
            if (msg.type === "meta") {
              totalSizeRef.current = msg.size;
              if (mountedRef.current) setStatus("receiving");
            } else if (msg.type === "done") {
              if (writableRef.current) {
                writeChainRef.current = writeChainRef.current
                  .then(() => writableRef.current!.close())
                  .then(() => { if (mountedRef.current) { setProgress(1); setStatus("done"); } })
                  .catch(() => {});
              } else {
                const blob = new Blob(chunksRef.current, { type: capturedSession.fileType || "application/octet-stream" });
                const url = URL.createObjectURL(blob);
                chunksRef.current = [];
                if (mountedRef.current) { setDownloadUrl(url); setProgress(1); setStatus("done"); }
              }
            }
          } else if (ev.data instanceof ArrayBuffer) {
            const chunk = ev.data as ArrayBuffer;
            receivedSizeRef.current += chunk.byteLength;
            const total = totalSizeRef.current || capturedSession.fileSize;
            if (mountedRef.current) setProgress(receivedSizeRef.current / total);
            if (writableRef.current) {
              writeChainRef.current = writeChainRef.current.then(() => writableRef.current!.write(chunk)).catch(() => {});
            } else { chunksRef.current.push(chunk); }
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
              {supportsStreamSave() ? "Choisir l'emplacement et télécharger →" : "Démarrer le téléchargement →"}
            </button>
            {!supportsStreamSave() && (
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

        {(status === "receiving" || status === "done") && session && (
          <>
            <div className="card mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📁</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground truncate">{session.fileName}</p>
                  <p className="text-foreground/50 text-sm">{formatBytes(session.fileSize)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded border shrink-0 ${status === "done" ? "border-green-500 text-green-500" : "border-accent text-accent"}`}>
                  {status === "done" ? "TERMINÉ" : streaming ? "ÉCRITURE" : "RÉCEPTION"}
                </span>
              </div>
            </div>

            <div className="card mb-6">
              <div className="flex justify-between text-sm text-foreground/60 mb-2">
                <span>{streaming ? "Écriture sur disque" : "Réception en mémoire"}</span>
                <span>{Math.round(progress * 100)}% · {formatBytes(progress * session.fileSize)} / {formatBytes(session.fileSize)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full bg-accent transition-all duration-200" style={{ width: `${progress * 100}%` }} />
              </div>
              {streaming && status === "receiving" && (
                <p className="text-foreground/30 text-xs mt-2">Écriture directe sur disque — aucun stockage en mémoire</p>
              )}
            </div>

            {status === "receiving" && (
              <button onClick={cancelReceiving} className="btn w-full mb-4 border border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 transition-colors">
                ✕ Annuler le téléchargement{streaming ? " (supprime le fichier partiel)" : ""}
              </button>
            )}

            {status === "done" && streaming && (
              <div className="card text-center py-4">
                <p className="text-green-400 font-bold">Fichier sauvegardé ✓</p>
                <p className="text-foreground/40 text-sm mt-1">Le fichier a été écrit directement sur votre disque.</p>
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
              <p className="text-foreground/60 text-sm">&gt; Téléchargement annulé{streaming ? " — fichier partiel supprimé" : ""}</p>
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
          <ul className="text-foreground/60 text-sm space-y-1">
            <li>• Le fichier vient directement du navigateur de l&apos;expéditeur</li>
            <li>• <span className="text-accent">Chrome/Edge</span> : écriture directe sur disque, taille illimitée</li>
            <li>• Firefox : chargé en mémoire RAM (limité par votre RAM disponible)</li>
            <li>• L&apos;expéditeur doit rester en ligne pendant le transfert</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
