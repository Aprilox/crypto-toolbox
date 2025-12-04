"use client";

import { useState } from "react";
import CopyButton from "@/app/components/CopyButton";

type EncodingType = "base64" | "url" | "hex";
type Mode = "encode" | "decode";

export default function EncodeTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [encoding, setEncoding] = useState<EncodingType>("base64");
  const [mode, setMode] = useState<Mode>("encode");
  const [error, setError] = useState("");

  const processText = () => {
    setError("");
    
    if (!input.trim()) {
      setOutput("");
      return;
    }

    try {
      let result = "";

      if (mode === "encode") {
        switch (encoding) {
          case "base64":
            result = btoa(unescape(encodeURIComponent(input)));
            break;
          case "url":
            result = encodeURIComponent(input);
            break;
          case "hex":
            result = Array.from(new TextEncoder().encode(input))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
            break;
        }
      } else {
        switch (encoding) {
          case "base64":
            result = decodeURIComponent(escape(atob(input.trim())));
            break;
          case "url":
            result = decodeURIComponent(input);
            break;
          case "hex":
            const hexStr = input.replace(/\s/g, '');
            if (!/^[0-9a-fA-F]*$/.test(hexStr)) {
              throw new Error("Format hexadécimal invalide");
            }
            const bytes = new Uint8Array(hexStr.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
            result = new TextDecoder().decode(bytes);
            break;
        }
      }

      setOutput(result);
    } catch (e) {
      setError(`Erreur: ${e instanceof Error ? e.message : "Format invalide"}`);
      setOutput("");
    }
  };

  const swapInputOutput = () => {
    setInput(output);
    setOutput("");
    setMode(mode === "encode" ? "decode" : "encode");
    setError("");
  };

  const encodingOptions: { value: EncodingType; label: string; description: string }[] = [
    { value: "base64", label: "Base64", description: "Encodage binaire vers ASCII" },
    { value: "url", label: "URL", description: "Encodage pour les URLs" },
    { value: "hex", label: "Hexadécimal", description: "Représentation hexadécimale" },
  ];

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">📝 Encode</span>
            <span className="text-accent"> / Decode</span>
          </h1>
          <p className="text-foreground/60">
            Encodez et décodez en Base64, URL et Hexadécimal
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="card mb-6">
          <div className="flex rounded overflow-hidden border border-border">
            <button
              onClick={() => { setMode("encode"); setOutput(""); setError(""); }}
              className={`flex-1 py-3 px-4 transition-all ${
                mode === "encode"
                  ? "bg-foreground text-background"
                  : "hover:bg-muted text-foreground/60"
              }`}
            >
              ➡️ Encoder
            </button>
            <button
              onClick={() => { setMode("decode"); setOutput(""); setError(""); }}
              className={`flex-1 py-3 px-4 transition-all ${
                mode === "decode"
                  ? "bg-foreground text-background"
                  : "hover:bg-muted text-foreground/60"
              }`}
            >
              ⬅️ Décoder
            </button>
          </div>
        </div>

        {/* Encoding Selection */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-accent mb-4">Type d&apos;encodage</h2>
          <div className="grid grid-cols-3 gap-3">
            {encodingOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => { setEncoding(option.value); setOutput(""); setError(""); }}
                className={`p-4 rounded border transition-all text-left ${
                  encoding === option.value
                    ? "border-foreground bg-foreground/10"
                    : "border-border hover:border-foreground/50"
                }`}
              >
                <div className="font-bold text-foreground">{option.label}</div>
                <div className="text-xs text-foreground/40 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="card mb-6">
          <label className="block text-foreground/80 mb-2">
            {mode === "encode" ? "Texte à encoder" : "Texte à décoder"}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encode" ? "Entrez le texte à encoder..." : "Entrez le texte encodé..."}
            className="w-full h-32 resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-foreground/40">{input.length} caractères</span>
            {input && (
              <button 
                onClick={() => { setInput(""); setOutput(""); setError(""); }}
                className="text-sm text-foreground/40 hover:text-foreground transition-colors"
              >
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* Process Button */}
        <div className="flex gap-3 mb-6">
          <button onClick={processText} className="btn flex-1">
            ⚡ {mode === "encode" ? "Encoder" : "Décoder"}
          </button>
          {output && (
            <button onClick={swapInputOutput} className="btn btn-cyan" title="Inverser entrée/sortie">
              🔄 Inverser
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="card mb-6 border-error bg-error/10">
            <p className="text-error">{error}</p>
          </div>
        )}

        {/* Output */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <label className="text-foreground/80">Résultat</label>
            {output && <CopyButton text={output} className="text-xs py-1 px-2" />}
          </div>
          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dot red"></div>
              <div className="terminal-dot yellow"></div>
              <div className="terminal-dot green"></div>
            </div>
            <code className="text-base break-all block min-h-[4rem] whitespace-pre-wrap">
              {output || <span className="text-foreground/30">Le résultat apparaîtra ici...</span>}
            </code>
          </div>
          {output && (
            <div className="mt-2 text-sm text-foreground/40">
              {output.length} caractères
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-8 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ À propos des encodages</h3>
          <ul className="text-foreground/60 text-sm space-y-1">
            <li>• <strong>Base64</strong> : Convertit les données binaires en texte ASCII</li>
            <li>• <strong>URL</strong> : Encode les caractères spéciaux pour les URLs</li>
            <li>• <strong>Hex</strong> : Représente chaque octet par 2 caractères hexadécimaux</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

