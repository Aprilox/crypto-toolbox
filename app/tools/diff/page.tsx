"use client";

import { useState, useMemo } from "react";

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber: { left?: number; right?: number };
}

export default function DiffTool() {
  const [textLeft, setTextLeft] = useState("");
  const [textRight, setTextRight] = useState("");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);

  const diff = useMemo(() => {
    const linesLeft = textLeft.split("\n");
    const linesRight = textRight.split("\n");

    const normalize = (s: string) => {
      let result = s;
      if (ignoreWhitespace) result = result.replace(/\s+/g, " ").trim();
      if (ignoreCase) result = result.toLowerCase();
      return result;
    };

    // Simple LCS-based diff
    const lcs = (a: string[], b: string[]): number[][] => {
      const m = a.length;
      const n = b.length;
      const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (normalize(a[i - 1]) === normalize(b[j - 1])) {
            dp[i][j] = dp[i - 1][j - 1] + 1;
          } else {
            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
          }
        }
      }
      return dp;
    };

    const buildDiff = (a: string[], b: string[], dp: number[][]): DiffLine[] => {
      const result: DiffLine[] = [];
      let i = a.length;
      let j = b.length;
      let leftLine = a.length;
      let rightLine = b.length;

      const tempResult: DiffLine[] = [];

      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && normalize(a[i - 1]) === normalize(b[j - 1])) {
          tempResult.push({
            type: "unchanged",
            content: a[i - 1],
            lineNumber: { left: leftLine, right: rightLine },
          });
          i--;
          j--;
          leftLine--;
          rightLine--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
          tempResult.push({
            type: "added",
            content: b[j - 1],
            lineNumber: { right: rightLine },
          });
          j--;
          rightLine--;
        } else if (i > 0) {
          tempResult.push({
            type: "removed",
            content: a[i - 1],
            lineNumber: { left: leftLine },
          });
          i--;
          leftLine--;
        }
      }

      return tempResult.reverse();
    };

    const dp = lcs(linesLeft, linesRight);
    return buildDiff(linesLeft, linesRight, dp);
  }, [textLeft, textRight, ignoreWhitespace, ignoreCase]);

  const stats = useMemo(() => {
    const added = diff.filter((d) => d.type === "added").length;
    const removed = diff.filter((d) => d.type === "removed").length;
    const unchanged = diff.filter((d) => d.type === "unchanged").length;
    return { added, removed, unchanged, total: diff.length };
  }, [diff]);

  const swapTexts = () => {
    const temp = textLeft;
    setTextLeft(textRight);
    setTextRight(temp);
  };

  const clearAll = () => {
    setTextLeft("");
    setTextRight("");
  };

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">📊 Text</span>
            <span className="text-accent"> Diff</span>
          </h1>
          <p className="text-foreground/60">
            Comparez deux textes et visualisez les différences
          </p>
        </div>

        {/* Options */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ignoreWhitespace}
                onChange={(e) => setIgnoreWhitespace(e.target.checked)}
              />
              <span className="text-foreground/80 text-sm">Ignorer les espaces</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ignoreCase}
                onChange={(e) => setIgnoreCase(e.target.checked)}
              />
              <span className="text-foreground/80 text-sm">Ignorer la casse</span>
            </label>
            <div className="flex-1" />
            <button onClick={swapTexts} className="btn text-sm py-1">
              🔄 Inverser
            </button>
            <button onClick={clearAll} className="btn btn-cyan text-sm py-1">
              🗑️ Effacer
            </button>
          </div>
        </div>

        {/* Input Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <label className="text-foreground/80 font-bold">📄 Texte original</label>
              <span className="text-foreground/40 text-sm">{textLeft.split("\n").length} lignes</span>
            </div>
            <textarea
              value={textLeft}
              onChange={(e) => setTextLeft(e.target.value)}
              placeholder="Collez le texte original ici..."
              className="w-full h-48 resize-none font-mono text-sm"
              spellCheck={false}
            />
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <label className="text-foreground/80 font-bold">📄 Texte modifié</label>
              <span className="text-foreground/40 text-sm">{textRight.split("\n").length} lignes</span>
            </div>
            <textarea
              value={textRight}
              onChange={(e) => setTextRight(e.target.value)}
              placeholder="Collez le texte modifié ici..."
              className="w-full h-48 resize-none font-mono text-sm"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Stats */}
        {(textLeft || textRight) && (
          <div className="card mb-6">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-background rounded">
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-xs text-foreground/40">Total lignes</div>
              </div>
              <div className="p-3 bg-foreground/10 rounded border border-foreground/30">
                <div className="text-2xl font-bold text-foreground">{stats.unchanged}</div>
                <div className="text-xs text-foreground/60">Identiques</div>
              </div>
              <div className="p-3 bg-green-500/10 rounded border border-green-500/30">
                <div className="text-2xl font-bold text-green-400">+{stats.added}</div>
                <div className="text-xs text-green-400/60">Ajoutées</div>
              </div>
              <div className="p-3 bg-red-500/10 rounded border border-red-500/30">
                <div className="text-2xl font-bold text-red-400">-{stats.removed}</div>
                <div className="text-xs text-red-400/60">Supprimées</div>
              </div>
            </div>
          </div>
        )}

        {/* Diff Output */}
        {diff.length > 0 && (textLeft || textRight) && (
          <div className="card">
            <h2 className="text-lg font-bold text-accent mb-4">🔍 Différences</h2>
            <div className="terminal max-h-[500px] overflow-auto">
              <div className="terminal-header">
                <div className="terminal-dot red"></div>
                <div className="terminal-dot yellow"></div>
                <div className="terminal-dot green"></div>
              </div>
              <div className="font-mono text-sm">
                {diff.map((line, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      line.type === "added"
                        ? "bg-green-500/20 text-green-300"
                        : line.type === "removed"
                        ? "bg-red-500/20 text-red-300"
                        : "text-foreground/60"
                    }`}
                  >
                    <span className="w-12 text-right pr-2 text-foreground/30 select-none border-r border-border mr-2">
                      {line.lineNumber.left || ""}
                    </span>
                    <span className="w-12 text-right pr-2 text-foreground/30 select-none border-r border-border mr-2">
                      {line.lineNumber.right || ""}
                    </span>
                    <span className="w-6 text-center select-none">
                      {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-all">
                      {line.content || " "}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!textLeft && !textRight && (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4 opacity-30">📊</div>
            <p className="text-foreground/30">
              Entrez deux textes à comparer pour voir les différences
            </p>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ Légende</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500/30 rounded"></span>
              <span className="text-foreground/60">Ligne ajoutée (+)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-500/30 rounded"></span>
              <span className="text-foreground/60">Ligne supprimée (-)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-foreground/10 rounded"></span>
              <span className="text-foreground/60">Ligne identique</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

