"use client";

import { useState, useCallback } from "react";
import CryptoJS from "crypto-js";
import CopyButton from "@/app/components/CopyButton";

interface FileChecksum {
  name: string;
  size: number;
  md5: string;
  sha256: string;
}

export default function ChecksumTool() {
  const [file, setFile] = useState<FileChecksum | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyResult, setVerifyResult] = useState<"match" | "no-match" | null>(null);

  const processFile = useCallback(async (selectedFile: File) => {
    setIsProcessing(true);
    setVerifyResult(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as unknown as number[]);
      
      const md5 = CryptoJS.MD5(wordArray).toString();
      const sha256 = CryptoJS.SHA256(wordArray).toString();

      setFile({
        name: selectedFile.name,
        size: selectedFile.size,
        md5,
        sha256,
      });
    } catch (error) {
      console.error("Error processing file:", error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }, [processFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const verifyChecksum = () => {
    if (!file || !verifyHash.trim()) return;

    const normalizedHash = verifyHash.trim().toLowerCase();
    const isMatch = 
      normalizedHash === file.md5.toLowerCase() ||
      normalizedHash === file.sha256.toLowerCase();
    
    setVerifyResult(isMatch ? "match" : "no-match");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const clearFile = () => {
    setFile(null);
    setVerifyHash("");
    setVerifyResult(null);
  };

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">📁 File</span>
            <span className="text-accent"> Checksum</span>
          </h1>
          <p className="text-foreground/60">
            Vérifiez l&apos;intégrité de vos fichiers avec MD5 et SHA-256
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`card mb-6 border-2 border-dashed transition-all cursor-pointer ${
            isDragging 
              ? "border-foreground bg-foreground/5" 
              : "border-border hover:border-foreground/50"
          } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
        >
          <label className="flex flex-col items-center justify-center py-12 cursor-pointer">
            <input
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
            {isProcessing ? (
              <>
                <div className="text-4xl mb-4 animate-spin">⏳</div>
                <p className="text-foreground/60">Calcul en cours...</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">📂</div>
                <p className="text-foreground mb-2">
                  Glissez-déposez un fichier ici
                </p>
                <p className="text-foreground/40 text-sm">
                  ou cliquez pour sélectionner
                </p>
              </>
            )}
          </label>
        </div>

        {/* Results */}
        {file && (
          <>
            {/* File Info */}
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-accent">Fichier</h2>
                <button
                  onClick={clearFile}
                  className="text-sm text-foreground/40 hover:text-foreground transition-colors"
                >
                  ✕ Fermer
                </button>
              </div>
              <div className="terminal mb-4">
                <div className="terminal-header">
                  <div className="terminal-dot red"></div>
                  <div className="terminal-dot yellow"></div>
                  <div className="terminal-dot green"></div>
                </div>
                <div className="space-y-1">
                  <p><span className="text-accent">Nom:</span> {file.name}</p>
                  <p><span className="text-accent">Taille:</span> {formatFileSize(file.size)}</p>
                </div>
              </div>

              {/* Checksums */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-foreground/60 text-sm">MD5</span>
                    <CopyButton text={file.md5} className="text-xs py-0.5 px-2" />
                  </div>
                  <code className="block p-3 bg-background rounded border border-border text-sm break-all">
                    {file.md5}
                  </code>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-foreground/60 text-sm">SHA-256</span>
                    <CopyButton text={file.sha256} className="text-xs py-0.5 px-2" />
                  </div>
                  <code className="block p-3 bg-background rounded border border-border text-sm break-all">
                    {file.sha256}
                  </code>
                </div>
              </div>
            </div>

            {/* Verify Section */}
            <div className="card">
              <h2 className="text-lg font-bold text-accent mb-4">Vérifier un checksum</h2>
              <p className="text-foreground/60 text-sm mb-4">
                Collez un hash pour vérifier s&apos;il correspond au fichier
              </p>
              <input
                type="text"
                value={verifyHash}
                onChange={(e) => { setVerifyHash(e.target.value); setVerifyResult(null); }}
                placeholder="Collez le hash à vérifier..."
                className="w-full mb-4"
              />
              <button
                onClick={verifyChecksum}
                className="btn w-full"
                disabled={!verifyHash.trim()}
              >
                ✓ Vérifier
              </button>

              {/* Verify Result */}
              {verifyResult && (
                <div className={`mt-4 p-4 rounded border ${
                  verifyResult === "match" 
                    ? "border-foreground bg-foreground/10" 
                    : "border-error bg-error/10"
                }`}>
                  {verifyResult === "match" ? (
                    <p className="text-foreground flex items-center gap-2">
                      <span className="text-xl">✓</span>
                      <span><strong>Correspondance !</strong> Le hash est identique.</span>
                    </p>
                  ) : (
                    <p className="text-error flex items-center gap-2">
                      <span className="text-xl">✕</span>
                      <span><strong>Pas de correspondance.</strong> Le hash est différent.</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Info */}
        <div className="mt-8 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ À propos des checksums</h3>
          <ul className="text-foreground/60 text-sm space-y-1">
            <li>• Un <strong>checksum</strong> est une empreinte unique d&apos;un fichier</li>
            <li>• Permet de vérifier qu&apos;un fichier n&apos;a pas été modifié</li>
            <li>• <strong>MD5</strong> : 128 bits, rapide mais vulnérable</li>
            <li>• <strong>SHA-256</strong> : 256 bits, recommandé pour la sécurité</li>
            <li>• Tout le traitement se fait <strong>localement</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

