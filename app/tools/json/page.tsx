"use client";

import { useState } from "react";
import CopyButton from "@/app/components/CopyButton";

type ViewMode = "tree" | "raw";

interface JsonError {
  message: string;
  line?: number;
  column?: number;
}

export default function JsonTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<JsonError | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("raw");
  const [indentSize, setIndentSize] = useState(2);
  const [stats, setStats] = useState<{ keys: number; depth: number; size: string } | null>(null);

  const parseAndValidate = (json: string): { parsed: unknown; error: JsonError | null } => {
    try {
      const parsed = JSON.parse(json);
      return { parsed, error: null };
    } catch (e) {
      const err = e as SyntaxError;
      const match = err.message.match(/position (\d+)/);
      const position = match ? parseInt(match[1]) : 0;
      
      // Calculate line and column from position
      const lines = json.substring(0, position).split("\n");
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;

      return {
        parsed: null,
        error: {
          message: err.message,
          line,
          column,
        },
      };
    }
  };

  const calculateStats = (obj: unknown, depth = 0): { keys: number; maxDepth: number } => {
    if (obj === null || typeof obj !== "object") {
      return { keys: 0, maxDepth: depth };
    }

    if (Array.isArray(obj)) {
      let totalKeys = 0;
      let maxDepth = depth;
      for (const item of obj) {
        const result = calculateStats(item, depth + 1);
        totalKeys += result.keys;
        maxDepth = Math.max(maxDepth, result.maxDepth);
      }
      return { keys: totalKeys, maxDepth };
    }

    let totalKeys = Object.keys(obj).length;
    let maxDepth = depth;
    for (const value of Object.values(obj)) {
      const result = calculateStats(value, depth + 1);
      totalKeys += result.keys;
      maxDepth = Math.max(maxDepth, result.maxDepth);
    }
    return { keys: totalKeys, maxDepth };
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const beautify = () => {
    if (!input.trim()) return;
    
    const { parsed, error } = parseAndValidate(input);
    if (error) {
      setError(error);
      setOutput("");
      setStats(null);
      return;
    }

    const formatted = JSON.stringify(parsed, null, indentSize);
    setOutput(formatted);
    setError(null);

    const { keys, maxDepth } = calculateStats(parsed);
    setStats({
      keys,
      depth: maxDepth,
      size: formatSize(new Blob([formatted]).size),
    });
  };

  const minify = () => {
    if (!input.trim()) return;
    
    const { parsed, error } = parseAndValidate(input);
    if (error) {
      setError(error);
      setOutput("");
      setStats(null);
      return;
    }

    const minified = JSON.stringify(parsed);
    setOutput(minified);
    setError(null);

    const { keys, maxDepth } = calculateStats(parsed);
    setStats({
      keys,
      depth: maxDepth,
      size: formatSize(new Blob([minified]).size),
    });
  };

  const validate = () => {
    if (!input.trim()) return;
    
    const { parsed, error } = parseAndValidate(input);
    if (error) {
      setError(error);
      setStats(null);
      return;
    }

    setError(null);
    const { keys, maxDepth } = calculateStats(parsed);
    setStats({
      keys,
      depth: maxDepth,
      size: formatSize(new Blob([input]).size),
    });
  };

  const sortKeys = () => {
    if (!input.trim()) return;
    
    const { parsed, error } = parseAndValidate(input);
    if (error) {
      setError(error);
      setOutput("");
      return;
    }

    const sortObject = (obj: unknown): unknown => {
      if (obj === null || typeof obj !== "object") return obj;
      if (Array.isArray(obj)) return obj.map(sortObject);
      
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(obj as Record<string, unknown>).sort();
      for (const key of keys) {
        sorted[key] = sortObject((obj as Record<string, unknown>)[key]);
      }
      return sorted;
    };

    const sorted = sortObject(parsed);
    setOutput(JSON.stringify(sorted, null, indentSize));
    setError(null);
  };

  const renderJsonTree = (data: unknown, depth = 0): React.ReactNode => {
    if (data === null) return <span className="text-foreground/40">null</span>;
    if (typeof data === "boolean") return <span className="text-accent">{data.toString()}</span>;
    if (typeof data === "number") return <span className="text-warning">{data}</span>;
    if (typeof data === "string") return <span className="text-foreground">&quot;{data}&quot;</span>;

    if (Array.isArray(data)) {
      if (data.length === 0) return <span className="text-foreground/40">[]</span>;
      return (
        <div className="ml-4">
          <span className="text-foreground/40">[</span>
          {data.map((item, i) => (
            <div key={i} className="ml-4">
              {renderJsonTree(item, depth + 1)}
              {i < data.length - 1 && <span className="text-foreground/40">,</span>}
            </div>
          ))}
          <span className="text-foreground/40">]</span>
        </div>
      );
    }

    if (typeof data === "object") {
      const entries = Object.entries(data as Record<string, unknown>);
      if (entries.length === 0) return <span className="text-foreground/40">{"{}"}</span>;
      return (
        <div className="ml-4">
          <span className="text-foreground/40">{"{"}</span>
          {entries.map(([key, value], i) => (
            <div key={key} className="ml-4">
              <span className="text-accent">&quot;{key}&quot;</span>
              <span className="text-foreground/40">: </span>
              {renderJsonTree(value, depth + 1)}
              {i < entries.length - 1 && <span className="text-foreground/40">,</span>}
            </div>
          ))}
          <span className="text-foreground/40">{"}"}</span>
        </div>
      );
    }

    return null;
  };

  const sampleJson = `{
  "name": "Crypto Toolbox",
  "version": "1.0.0",
  "features": ["hash", "encrypt", "qrcode"],
  "settings": {
    "theme": "matrix",
    "darkMode": true
  }
}`;

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">📋 JSON</span>
            <span className="text-accent"> Formatter</span>
          </h1>
          <p className="text-foreground/60">
            Formatez, minifiez et validez votre JSON
          </p>
        </div>

        {/* Input */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-foreground/80">JSON Input</label>
            <button
              onClick={() => setInput(sampleJson)}
              className="text-sm text-accent hover:text-foreground transition-colors"
            >
              📝 Exemple
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Collez votre JSON ici..."
            className="w-full h-48 resize-none font-mono text-sm"
            spellCheck={false}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-foreground/40">
              {input.length} caractères
            </span>
            {input && (
              <button 
                onClick={() => { setInput(""); setOutput(""); setError(null); setStats(null); }}
                className="text-sm text-foreground/40 hover:text-foreground transition-colors"
              >
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <button onClick={beautify} className="btn flex-1">
              ✨ Beautify
            </button>
            <button onClick={minify} className="btn flex-1">
              📦 Minify
            </button>
            <button onClick={validate} className="btn btn-cyan flex-1">
              ✓ Validate
            </button>
            <button onClick={sortKeys} className="btn flex-1">
              🔤 Sort Keys
            </button>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-foreground/60 text-sm">Indentation:</label>
              <select
                value={indentSize}
                onChange={(e) => setIndentSize(Number(e.target.value))}
                className="bg-background border border-border rounded px-2 py-1 text-sm"
              >
                <option value={2}>2 espaces</option>
                <option value={4}>4 espaces</option>
                <option value={1}>1 espace</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="card mb-6 border-error bg-error/10">
            <div className="flex items-start gap-3">
              <span className="text-2xl">❌</span>
              <div>
                <p className="text-error font-bold">JSON Invalide</p>
                <p className="text-error/80 text-sm mt-1">{error.message}</p>
                {error.line && (
                  <p className="text-error/60 text-xs mt-1">
                    Ligne {error.line}, Colonne {error.column}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success + Stats */}
        {!error && stats && (
          <div className="card mb-6 border-foreground/50 bg-foreground/5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">✅</span>
              <span className="text-foreground font-bold">JSON Valide</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-2 bg-background rounded">
                <div className="text-xl font-bold text-foreground">{stats.keys}</div>
                <div className="text-xs text-foreground/40">Clés</div>
              </div>
              <div className="p-2 bg-background rounded">
                <div className="text-xl font-bold text-foreground">{stats.depth}</div>
                <div className="text-xs text-foreground/40">Profondeur</div>
              </div>
              <div className="p-2 bg-background rounded">
                <div className="text-xl font-bold text-foreground">{stats.size}</div>
                <div className="text-xs text-foreground/40">Taille</div>
              </div>
            </div>
          </div>
        )}

        {/* Output */}
        {output && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-accent">Résultat</h2>
              <div className="flex items-center gap-2">
                <div className="flex rounded overflow-hidden border border-border">
                  <button
                    onClick={() => setViewMode("raw")}
                    className={`px-3 py-1 text-sm transition-all ${
                      viewMode === "raw"
                        ? "bg-foreground text-background"
                        : "hover:bg-muted text-foreground/60"
                    }`}
                  >
                    Raw
                  </button>
                  <button
                    onClick={() => setViewMode("tree")}
                    className={`px-3 py-1 text-sm transition-all ${
                      viewMode === "tree"
                        ? "bg-foreground text-background"
                        : "hover:bg-muted text-foreground/60"
                    }`}
                  >
                    Tree
                  </button>
                </div>
                <CopyButton text={output} />
              </div>
            </div>

            <div className="terminal max-h-96 overflow-auto">
              <div className="terminal-header">
                <div className="terminal-dot red"></div>
                <div className="terminal-dot yellow"></div>
                <div className="terminal-dot green"></div>
              </div>
              {viewMode === "raw" ? (
                <pre className="text-sm whitespace-pre-wrap break-all">{output}</pre>
              ) : (
                <div className="text-sm font-mono">
                  {renderJsonTree(JSON.parse(output))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ Fonctionnalités</h3>
          <ul className="text-foreground/60 text-sm space-y-1">
            <li>• <strong>Beautify</strong> : Formate avec indentation pour la lisibilité</li>
            <li>• <strong>Minify</strong> : Supprime les espaces pour réduire la taille</li>
            <li>• <strong>Validate</strong> : Vérifie la syntaxe JSON</li>
            <li>• <strong>Sort Keys</strong> : Trie les clés alphabétiquement</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

