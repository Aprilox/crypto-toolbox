"use client";

import { useState } from "react";
import { v1 as uuidv1, v4 as uuidv4 } from "uuid";
import CopyButton from "@/app/components/CopyButton";

type UUIDVersion = "v1" | "v4";

interface GeneratedUUID {
  value: string;
  version: UUIDVersion;
  timestamp: Date;
}

export default function UUIDTool() {
  const [uuids, setUuids] = useState<GeneratedUUID[]>([]);
  const [version, setVersion] = useState<UUIDVersion>("v4");
  const [count, setCount] = useState(1);
  const [uppercase, setUppercase] = useState(false);
  const [noDashes, setNoDashes] = useState(false);

  const generateUUIDs = () => {
    const newUuids: GeneratedUUID[] = [];
    
    for (let i = 0; i < count; i++) {
      let value = version === "v1" ? uuidv1() : uuidv4();
      
      if (uppercase) value = value.toUpperCase();
      if (noDashes) value = value.replace(/-/g, "");
      
      newUuids.push({
        value,
        version,
        timestamp: new Date(),
      });
    }

    setUuids(prev => [...newUuids, ...prev].slice(0, 100));
  };

  const copyAll = () => {
    const text = uuids.map(u => u.value).join("\n");
    navigator.clipboard.writeText(text);
  };

  const clearHistory = () => {
    setUuids([]);
  };

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">🎲 UUID</span>
            <span className="text-accent"> Generator</span>
          </h1>
          <p className="text-foreground/60">
            Générez des identifiants uniques UUID v1 et v4
          </p>
        </div>

        {/* Version Selection */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-accent mb-4">Version</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setVersion("v1")}
              className={`p-4 rounded border transition-all text-left ${
                version === "v1"
                  ? "border-foreground bg-foreground/10"
                  : "border-border hover:border-foreground/50"
              }`}
            >
              <div className="font-bold text-foreground">UUID v1</div>
              <div className="text-xs text-foreground/40 mt-1">
                Basé sur le timestamp + MAC address
              </div>
            </button>
            <button
              onClick={() => setVersion("v4")}
              className={`p-4 rounded border transition-all text-left ${
                version === "v4"
                  ? "border-foreground bg-foreground/10"
                  : "border-border hover:border-foreground/50"
              }`}
            >
              <div className="font-bold text-foreground">UUID v4</div>
              <div className="text-xs text-foreground/40 mt-1">
                Complètement aléatoire (recommandé)
              </div>
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-accent mb-4">Options</h2>
          
          {/* Count */}
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <label className="text-foreground/80">Nombre à générer</label>
              <span className="text-foreground font-bold">{count}</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-foreground/40 mt-1">
              <span>1</span>
              <span>50</span>
            </div>
          </div>

          {/* Format options */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
              />
              <span className="text-foreground/80">Majuscules</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={noDashes}
                onChange={(e) => setNoDashes(e.target.checked)}
              />
              <span className="text-foreground/80">Sans tirets</span>
            </label>
          </div>
        </div>

        {/* Generate Button */}
        <button onClick={generateUUIDs} className="btn w-full mb-6">
          ⚡ Générer {count} UUID{count > 1 ? "s" : ""}
        </button>

        {/* Results */}
        {uuids.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-accent">
                UUIDs générés ({uuids.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={copyAll}
                  className="btn text-xs py-1 px-3"
                >
                  📋 Copier tout
                </button>
                <button
                  onClick={clearHistory}
                  className="btn btn-cyan text-xs py-1 px-3"
                >
                  🗑️ Effacer
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {uuids.map((uuid, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 p-3 bg-background rounded border border-border group"
                >
                  <div className="flex-1 min-w-0">
                    <code className="text-sm break-all text-foreground/80 block">
                      {uuid.value}
                    </code>
                    <span className="text-xs text-foreground/30">
                      {uuid.version.toUpperCase()} • {uuid.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <CopyButton text={uuid.value} className="text-xs py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ À propos des UUIDs</h3>
          <ul className="text-foreground/60 text-sm space-y-1">
            <li>• <strong>UUID</strong> = Universally Unique Identifier (128 bits)</li>
            <li>• <strong>v1</strong> : Basé sur le timestamp, peut révéler des infos</li>
            <li>• <strong>v4</strong> : Aléatoire, plus privé et recommandé</li>
            <li>• Probabilité de collision v4 : ~1 sur 2.71 quintillions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

