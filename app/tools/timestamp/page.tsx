"use client";

import { useState, useEffect } from "react";
import CopyButton from "@/app/components/CopyButton";

export default function TimestampTool() {
  const [unixTimestamp, setUnixTimestamp] = useState("");
  const [dateString, setDateString] = useState("");
  const [currentTimestamp, setCurrentTimestamp] = useState(Math.floor(Date.now() / 1000));
  const [timezone, setTimezone] = useState("local");

  // Update current timestamp every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimestamp(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const convertFromUnix = (timestamp: string) => {
    setUnixTimestamp(timestamp);
    if (!timestamp.trim()) {
      setDateString("");
      return;
    }

    try {
      let ts = parseInt(timestamp);
      // Auto-detect milliseconds vs seconds
      if (ts > 9999999999) {
        ts = Math.floor(ts / 1000);
      }
      
      const date = new Date(ts * 1000);
      if (isNaN(date.getTime())) {
        setDateString("Invalid timestamp");
        return;
      }

      if (timezone === "utc") {
        setDateString(date.toISOString());
      } else {
        setDateString(date.toLocaleString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }));
      }
    } catch {
      setDateString("Invalid timestamp");
    }
  };

  const convertToUnix = (dateStr: string) => {
    setDateString(dateStr);
    if (!dateStr.trim()) {
      setUnixTimestamp("");
      return;
    }

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        setUnixTimestamp("Invalid date");
        return;
      }
      setUnixTimestamp(Math.floor(date.getTime() / 1000).toString());
    } catch {
      setUnixTimestamp("Invalid date");
    }
  };

  const setNow = () => {
    const now = Math.floor(Date.now() / 1000);
    setUnixTimestamp(now.toString());
    convertFromUnix(now.toString());
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return {
      iso: date.toISOString(),
      local: date.toLocaleString("fr-FR"),
      relative: getRelativeTime(date),
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `il y a ${years} an${years > 1 ? "s" : ""}`;
    if (months > 0) return `il y a ${months} mois`;
    if (days > 0) return `il y a ${days} jour${days > 1 ? "s" : ""}`;
    if (hours > 0) return `il y a ${hours} heure${hours > 1 ? "s" : ""}`;
    if (minutes > 0) return `il y a ${minutes} minute${minutes > 1 ? "s" : ""}`;
    return `il y a ${seconds} seconde${seconds > 1 ? "s" : ""}`;
  };

  const quickDates = [
    { label: "Maintenant", getValue: () => Math.floor(Date.now() / 1000) },
    { label: "+1 heure", getValue: () => Math.floor(Date.now() / 1000) + 3600 },
    { label: "+1 jour", getValue: () => Math.floor(Date.now() / 1000) + 86400 },
    { label: "+1 semaine", getValue: () => Math.floor(Date.now() / 1000) + 604800 },
    { label: "+1 mois", getValue: () => Math.floor(Date.now() / 1000) + 2592000 },
    { label: "Epoch (0)", getValue: () => 0 },
  ];

  const currentFormatted = formatDate(currentTimestamp);

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">🕐 Timestamp</span>
            <span className="text-accent"> Converter</span>
          </h1>
          <p className="text-foreground/60">
            Convertissez entre Unix timestamp et date lisible
          </p>
        </div>

        {/* Current Timestamp */}
        <div className="card mb-6 border-accent/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-accent">⏱️ Timestamp actuel</h2>
            <span className="text-xs text-foreground/40">Heure de votre navigateur</span>
          </div>
          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dot red"></div>
              <div className="terminal-dot yellow"></div>
              <div className="terminal-dot green"></div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">{currentTimestamp}</div>
            <div className="text-foreground/60 text-sm">{currentFormatted.local}</div>
            <div className="text-foreground/40 text-xs mt-1">{currentFormatted.iso}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button 
              onClick={() => navigator.clipboard.writeText(currentTimestamp.toString())}
              className="btn text-sm py-2"
            >
              📋 Copier Unix
            </button>
            <button 
              onClick={() => navigator.clipboard.writeText(currentFormatted.iso)}
              className="btn btn-cyan text-sm py-2"
            >
              📋 Copier ISO
            </button>
          </div>
        </div>

        {/* Timezone Toggle */}
        <div className="card mb-6">
          <div className="flex rounded overflow-hidden border border-border">
            <button
              onClick={() => setTimezone("local")}
              className={`flex-1 py-2 px-4 transition-all text-sm ${
                timezone === "local"
                  ? "bg-foreground text-background"
                  : "hover:bg-muted text-foreground/60"
              }`}
            >
              🏠 Heure locale
            </button>
            <button
              onClick={() => setTimezone("utc")}
              className={`flex-1 py-2 px-4 transition-all text-sm ${
                timezone === "utc"
                  ? "bg-foreground text-background"
                  : "hover:bg-muted text-foreground/60"
              }`}
            >
              🌍 UTC / ISO 8601
            </button>
          </div>
        </div>

        {/* Unix to Date */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-accent mb-4">Unix → Date</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-foreground/80 mb-2">Timestamp Unix</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={unixTimestamp}
                  onChange={(e) => convertFromUnix(e.target.value)}
                  placeholder="Ex: 1701705600"
                  className="flex-1"
                />
                <button onClick={setNow} className="btn">
                  Now
                </button>
              </div>
            </div>
            
            {dateString && !dateString.includes("Invalid") && (
              <div className="p-4 bg-background rounded border border-border">
                <div className="text-foreground font-medium">{dateString}</div>
                {unixTimestamp && !isNaN(parseInt(unixTimestamp)) && (
                  <div className="text-foreground/40 text-sm mt-1">
                    {getRelativeTime(new Date(parseInt(unixTimestamp) * 1000))}
                  </div>
                )}
              </div>
            )}

            {dateString.includes("Invalid") && (
              <div className="p-3 bg-error/10 border border-error rounded text-error text-sm">
                {dateString}
              </div>
            )}
          </div>
        </div>

        {/* Date to Unix */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-accent mb-4">Date → Unix</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-foreground/80 mb-2">Date et heure</label>
              <input
                type="datetime-local"
                onChange={(e) => convertToUnix(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-foreground/80 mb-2">Ou texte libre</label>
              <input
                type="text"
                placeholder="Ex: 2024-12-25, December 25 2024, etc."
                onChange={(e) => convertToUnix(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Quick Dates */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-accent mb-4">⚡ Raccourcis</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {quickDates.map((quick) => (
              <button
                key={quick.label}
                onClick={() => convertFromUnix(quick.getValue().toString())}
                className="p-2 rounded border border-border hover:border-foreground/50 text-sm text-foreground/60 hover:text-foreground transition-all"
              >
                {quick.label}
              </button>
            ))}
          </div>
        </div>

        {/* Common Timestamps Reference */}
        <div className="card">
          <h2 className="text-lg font-bold text-accent mb-4">📅 Références</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 bg-background rounded">
              <span className="text-foreground/60">Epoch (1 Jan 1970)</span>
              <code className="text-foreground">0</code>
            </div>
            <div className="flex justify-between p-2 bg-background rounded">
              <span className="text-foreground/60">Y2K (1 Jan 2000)</span>
              <code className="text-foreground">946684800</code>
            </div>
            <div className="flex justify-between p-2 bg-background rounded">
              <span className="text-foreground/60">1 Jan 2024</span>
              <code className="text-foreground">1704067200</code>
            </div>
            <div className="flex justify-between p-2 bg-background rounded">
              <span className="text-foreground/60">1 Jan 2025</span>
              <code className="text-foreground">1735689600</code>
            </div>
            <div className="flex justify-between p-2 bg-background rounded">
              <span className="text-foreground/60">Max 32-bit (19 Jan 2038)</span>
              <code className="text-foreground">2147483647</code>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ À propos</h3>
          <ul className="text-foreground/60 text-sm space-y-1">
            <li>• <strong>Unix timestamp</strong> = secondes depuis le 1er janvier 1970 UTC</li>
            <li>• Détection automatique millisecondes vs secondes</li>
            <li>• <strong>Y2K38</strong> : les systèmes 32-bit déborderont le 19 janvier 2038</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

