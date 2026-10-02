"use client";

import { useState, useEffect } from "react";
import CopyButton from "@/app/components/CopyButton";

interface DecodedJWT {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

export default function JWTTool() {
  const [token, setToken] = useState("");
  const [decoded, setDecoded] = useState<DecodedJWT | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"header" | "payload" | "signature">("payload");

  useEffect(() => {
    if (!token.trim()) {
      setDecoded(null);
      setError("");
      return;
    }

    try {
      const parts = token.trim().split(".");
      
      if (parts.length !== 3) {
        throw new Error("Format JWT invalide. Un JWT doit avoir 3 parties séparées par des points.");
      }

      const decodeBase64Url = (str: string) => {
        // Replace Base64URL characters with Base64
        let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
        // Add padding if needed
        const padding = base64.length % 4;
        if (padding) {
          base64 += "=".repeat(4 - padding);
        }
        return JSON.parse(atob(base64));
      };

      const header = decodeBase64Url(parts[0]);
      const payload = decodeBase64Url(parts[1]);
      const signature = parts[2];

      setDecoded({ header, payload, signature });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du décodage");
      setDecoded(null);
    }
  }, [token]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString("fr-FR", {
      dateStyle: "full",
      timeStyle: "medium",
    });
  };

  const isExpired = () => {
    if (!decoded?.payload.exp) return null;
    return Date.now() > (decoded.payload.exp as number) * 1000;
  };

  const getTimeUntilExpiry = () => {
    if (!decoded?.payload.exp) return null;
    const exp = (decoded.payload.exp as number) * 1000;
    const diff = exp - Date.now();
    
    if (diff < 0) {
      const absDiff = Math.abs(diff);
      const hours = Math.floor(absDiff / 3600000);
      const minutes = Math.floor((absDiff % 3600000) / 60000);
      return `Expiré depuis ${hours}h ${minutes}min`;
    }
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `Expire dans ${hours}h ${minutes}min`;
  };

  const renderValue = (key: string, value: unknown): React.ReactNode => {
    // Special rendering for timestamps
    if ((key === "exp" || key === "iat" || key === "nbf") && typeof value === "number") {
      return (
        <span>
          <span className="text-accent">{value}</span>
          <span className="text-foreground/40 ml-2">({formatDate(value)})</span>
        </span>
      );
    }

    if (typeof value === "string") {
      return <span className="text-accent">&quot;{value}&quot;</span>;
    }
    if (typeof value === "number") {
      return <span className="text-warning">{value}</span>;
    }
    if (typeof value === "boolean") {
      return <span className="text-accent">{value.toString()}</span>;
    }
    if (value === null) {
      return <span className="text-foreground/40">null</span>;
    }
    if (Array.isArray(value)) {
      return <span className="text-accent">[{value.join(", ")}]</span>;
    }
    return <span className="text-foreground/60">{JSON.stringify(value)}</span>;
  };

  const renderObject = (obj: Record<string, unknown>) => {
    return (
      <div className="space-y-2">
        {Object.entries(obj).map(([key, value]) => (
          <div key={key} className="flex">
            <span className="text-foreground/60 mr-2">{key}:</span>
            {renderValue(key, value)}
          </div>
        ))}
      </div>
    );
  };

  const tabs = [
    { id: "header" as const, label: "Header", icon: "📋" },
    { id: "payload" as const, label: "Payload", icon: "📦" },
    { id: "signature" as const, label: "Signature", icon: "✍️" },
  ];

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">🎫 JWT</span>
            <span className="text-accent"> Decoder</span>
          </h1>
          <p className="text-foreground/60">
            Décodez et analysez vos JSON Web Tokens
          </p>
        </div>

        {/* Input */}
        <div className="card mb-6">
          <label className="block text-foreground/80 mb-2">
            Token JWT
          </label>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full h-32 resize-none text-sm"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-foreground/40">
              {token.split(".").length === 3 ? "3 parties détectées" : "Format attendu: header.payload.signature"}
            </span>
            {token && (
              <button 
                onClick={() => setToken("")}
                className="text-sm text-foreground/40 hover:text-foreground transition-colors"
              >
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="card mb-6 border-error bg-error/10">
            <p className="text-error">{error}</p>
          </div>
        )}

        {/* Decoded Result */}
        {decoded && (
          <>
            {/* Expiry Status */}
            {decoded.payload.exp && (
              <div className={`card mb-6 ${isExpired() ? "border-error bg-error/10" : "border-foreground bg-foreground/5"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{isExpired() ? "⚠️" : "✓"}</span>
                  <div>
                    <p className={isExpired() ? "text-error font-bold" : "text-foreground font-bold"}>
                      {isExpired() ? "Token Expiré" : "Token Valide"}
                    </p>
                    <p className="text-foreground/60 text-sm">
                      {getTimeUntilExpiry()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="card">
              <div className="flex border-b border-border mb-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 px-4 transition-all ${
                      activeTab === tab.id
                        ? "text-foreground border-b-2 border-foreground"
                        : "text-foreground/40 hover:text-foreground/60"
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="terminal">
                <div className="terminal-header">
                  <div className="terminal-dot red"></div>
                  <div className="terminal-dot yellow"></div>
                  <div className="terminal-dot green"></div>
                </div>

                {activeTab === "header" && (
                  <div>
                    <div className="flex justify-end mb-2">
                      <CopyButton 
                        text={JSON.stringify(decoded.header, null, 2)} 
                        className="text-xs py-0.5 px-2" 
                      />
                    </div>
                    {renderObject(decoded.header)}
                  </div>
                )}

                {activeTab === "payload" && (
                  <div>
                    <div className="flex justify-end mb-2">
                      <CopyButton 
                        text={JSON.stringify(decoded.payload, null, 2)} 
                        className="text-xs py-0.5 px-2" 
                      />
                    </div>
                    {renderObject(decoded.payload)}
                  </div>
                )}

                {activeTab === "signature" && (
                  <div>
                    <div className="flex justify-end mb-2">
                      <CopyButton 
                        text={decoded.signature} 
                        className="text-xs py-0.5 px-2" 
                      />
                    </div>
                    <code className="text-sm break-all text-accent">
                      {decoded.signature}
                    </code>
                    <p className="text-foreground/40 text-sm mt-4">
                      ⚠️ La signature ne peut être vérifiée que côté serveur avec la clé secrète
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Info */}
        <div className="mt-8 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ À propos des JWT</h3>
          <ul className="text-foreground/60 text-sm space-y-1">
            <li>• <strong>JWT</strong> = JSON Web Token, standard pour l&apos;authentification</li>
            <li>• <strong>Header</strong> : Algorithme et type de token</li>
            <li>• <strong>Payload</strong> : Données (claims) du token</li>
            <li>• <strong>Signature</strong> : Garantit l&apos;intégrité du token</li>
            <li>• Claims courants : <code>exp</code> (expiration), <code>iat</code> (issued at), <code>sub</code> (subject)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

