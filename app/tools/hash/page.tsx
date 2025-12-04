"use client";

import { useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import CopyButton from "@/app/components/CopyButton";

type HashType = "MD5" | "SHA1" | "SHA256" | "SHA512";

const hashFunctions: Record<HashType, (input: string) => string> = {
  MD5: (input) => CryptoJS.MD5(input).toString(),
  SHA1: (input) => CryptoJS.SHA1(input).toString(),
  SHA256: (input) => CryptoJS.SHA256(input).toString(),
  SHA512: (input) => CryptoJS.SHA512(input).toString(),
};

const hashDescriptions: Record<HashType, string> = {
  MD5: "128-bit (déprécié pour la sécurité)",
  SHA1: "160-bit (déprécié pour la sécurité)",
  SHA256: "256-bit (recommandé)",
  SHA512: "512-bit (le plus sécurisé)",
};

export default function HashTool() {
  const [input, setInput] = useState("");
  const [selectedHash, setSelectedHash] = useState<HashType>("SHA256");
  const [showAll, setShowAll] = useState(false);
  const [hashes, setHashes] = useState<Record<HashType, string>>({
    MD5: "",
    SHA1: "",
    SHA256: "",
    SHA512: "",
  });

  useEffect(() => {
    if (input) {
      const newHashes: Record<HashType, string> = {
        MD5: hashFunctions.MD5(input),
        SHA1: hashFunctions.SHA1(input),
        SHA256: hashFunctions.SHA256(input),
        SHA512: hashFunctions.SHA512(input),
      };
      setHashes(newHashes);
    } else {
      setHashes({ MD5: "", SHA1: "", SHA256: "", SHA512: "" });
    }
  }, [input]);

  const hashTypes: HashType[] = ["MD5", "SHA1", "SHA256", "SHA512"];

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">🔒 Hash</span>
            <span className="text-accent"> Generator</span>
          </h1>
          <p className="text-foreground/60">
            Calculez les hachages MD5, SHA-1, SHA-256 et SHA-512
          </p>
        </div>

        {/* Input */}
        <div className="card mb-6">
          <label className="block text-foreground/80 mb-2">
            Texte à hacher
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Entrez votre texte ici..."
            className="w-full h-32 resize-none"
          />
          <div className="flex justify-between items-center mt-2 text-sm text-foreground/40">
            <span>{input.length} caractères</span>
            {input && (
              <button 
                onClick={() => setInput("")}
                className="hover:text-foreground transition-colors"
              >
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* Hash Selection */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-accent">Algorithme</h2>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />
              <span className="text-foreground/60">Afficher tous</span>
            </label>
          </div>

          {!showAll ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {hashTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedHash(type)}
                  className={`p-3 rounded border transition-all ${
                    selectedHash === type
                      ? "border-foreground bg-foreground/10 text-foreground"
                      : "border-border hover:border-foreground/50 text-foreground/60"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Results */}
        {showAll ? (
          <div className="space-y-4">
            {hashTypes.map((type) => (
              <div key={type} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-foreground">{type}</span>
                    <span className="text-foreground/40 text-sm ml-2">
                      {hashDescriptions[type]}
                    </span>
                  </div>
                  {hashes[type] && <CopyButton text={hashes[type]} className="text-xs py-1 px-2" />}
                </div>
                <div className="terminal">
                  <code className="text-sm break-all">
                    {hashes[type] || <span className="text-foreground/30">-</span>}
                  </code>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-bold text-foreground">{selectedHash}</span>
                <span className="text-foreground/40 text-sm ml-2">
                  {hashDescriptions[selectedHash]}
                </span>
              </div>
            </div>
            <div className="terminal mb-4">
              <div className="terminal-header">
                <div className="terminal-dot red"></div>
                <div className="terminal-dot yellow"></div>
                <div className="terminal-dot green"></div>
              </div>
              <code className="text-base break-all block min-h-[1.5rem]">
                {hashes[selectedHash] || <span className="text-foreground/30">Le hash apparaîtra ici...</span>}
              </code>
            </div>
            {hashes[selectedHash] && (
              <CopyButton text={hashes[selectedHash]} className="w-full" />
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ À propos du hachage</h3>
          <ul className="text-foreground/60 text-sm space-y-1">
            <li>• Le hachage est une fonction à sens unique (irréversible)</li>
            <li>• MD5 et SHA-1 sont vulnérables aux collisions</li>
            <li>• SHA-256 est recommandé pour la plupart des usages</li>
            <li>• SHA-512 offre la meilleure sécurité mais est plus long</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

