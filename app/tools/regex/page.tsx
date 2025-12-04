"use client";

import { useState, useMemo } from "react";
import CopyButton from "@/app/components/CopyButton";

interface MatchInfo {
  match: string;
  index: number;
  groups: string[];
}

export default function RegexTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [testString, setTestString] = useState("");
  const [replaceWith, setReplaceWith] = useState("");

  const flagOptions = [
    { flag: "g", label: "Global", description: "Toutes les correspondances" },
    { flag: "i", label: "Insensible", description: "Ignore la casse" },
    { flag: "m", label: "Multiline", description: "^ et $ par ligne" },
    { flag: "s", label: "DotAll", description: ". inclut \\n" },
  ];

  const { regex, error, matches, highlightedText, replacedText } = useMemo(() => {
    if (!pattern) {
      return { regex: null, error: null, matches: [], highlightedText: testString, replacedText: "" };
    }

    try {
      const re = new RegExp(pattern, flags);
      const matchList: MatchInfo[] = [];
      let match;

      if (flags.includes("g")) {
        while ((match = re.exec(testString)) !== null) {
          matchList.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1),
          });
          // Prevent infinite loop for zero-length matches
          if (match[0].length === 0) re.lastIndex++;
        }
      } else {
        match = re.exec(testString);
        if (match) {
          matchList.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1),
          });
        }
      }

      // Build highlighted text
      let highlighted = testString;
      let offset = 0;
      const sortedMatches = [...matchList].sort((a, b) => a.index - b.index);
      
      for (const m of sortedMatches) {
        const before = highlighted.substring(0, m.index + offset);
        const matched = highlighted.substring(m.index + offset, m.index + offset + m.match.length);
        const after = highlighted.substring(m.index + offset + m.match.length);
        const replacement = `<mark class="bg-foreground/30 text-foreground px-0.5 rounded">${matched}</mark>`;
        highlighted = before + replacement + after;
        offset += replacement.length - m.match.length;
      }

      // Build replaced text
      let replaced = "";
      if (replaceWith !== undefined) {
        try {
          replaced = testString.replace(re, replaceWith);
        } catch {
          replaced = "";
        }
      }

      return { regex: re, error: null, matches: matchList, highlightedText: highlighted, replacedText: replaced };
    } catch (e) {
      return {
        regex: null,
        error: (e as Error).message,
        matches: [],
        highlightedText: testString,
        replacedText: "",
      };
    }
  }, [pattern, flags, testString, replaceWith]);

  const toggleFlag = (flag: string) => {
    if (flags.includes(flag)) {
      setFlags(flags.replace(flag, ""));
    } else {
      setFlags(flags + flag);
    }
  };

  const commonPatterns = [
    { name: "Email", pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}" },
    { name: "URL", pattern: "https?://[\\w\\-._~:/?#[\\]@!$&'()*+,;=]+" },
    { name: "Téléphone FR", pattern: "(?:(?:\\+|00)33|0)\\s*[1-9](?:[\\s.-]*\\d{2}){4}" },
    { name: "IPv4", pattern: "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b" },
    { name: "Date JJ/MM/AAAA", pattern: "\\d{2}/\\d{2}/\\d{4}" },
    { name: "Hex Color", pattern: "#[0-9A-Fa-f]{6}\\b" },
    { name: "Mot", pattern: "\\b\\w+\\b" },
    { name: "Nombre", pattern: "-?\\d+(?:\\.\\d+)?" },
  ];

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">🔍 Regex</span>
            <span className="text-accent"> Tester</span>
          </h1>
          <p className="text-foreground/60">
            Testez et débuggez vos expressions régulières en temps réel
          </p>
        </div>

        {/* Pattern Input */}
        <div className="card mb-6">
          <label className="block text-foreground/80 mb-2">Expression régulière</label>
          <div className="flex items-center gap-2">
            <span className="text-foreground/40 text-xl">/</span>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Votre regex ici..."
              className="flex-1 font-mono"
              spellCheck={false}
            />
            <span className="text-foreground/40 text-xl">/</span>
            <input
              type="text"
              value={flags}
              onChange={(e) => setFlags(e.target.value)}
              className="w-16 font-mono text-center"
              placeholder="flags"
            />
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-2 mt-3">
            {flagOptions.map((opt) => (
              <button
                key={opt.flag}
                onClick={() => toggleFlag(opt.flag)}
                className={`px-3 py-1 rounded border text-sm transition-all ${
                  flags.includes(opt.flag)
                    ? "border-foreground bg-foreground/10 text-foreground"
                    : "border-border text-foreground/40 hover:border-foreground/50"
                }`}
                title={opt.description}
              >
                {opt.flag} - {opt.label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 p-3 bg-error/10 border border-error rounded text-error text-sm">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Common Patterns */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-accent mb-3">⚡ Patterns courants</h2>
          <div className="flex flex-wrap gap-2">
            {commonPatterns.map((p) => (
              <button
                key={p.name}
                onClick={() => setPattern(p.pattern)}
                className="px-3 py-1 rounded border border-border text-sm text-foreground/60 hover:border-foreground/50 hover:text-foreground transition-all"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Test String */}
        <div className="card mb-6">
          <label className="block text-foreground/80 mb-2">Texte de test</label>
          <textarea
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Entrez le texte à tester..."
            className="w-full h-32 resize-none font-mono text-sm"
            spellCheck={false}
          />
          <div className="text-sm text-foreground/40 mt-1">
            {testString.length} caractères
          </div>
        </div>

        {/* Results */}
        {pattern && !error && (
          <>
            {/* Match Count */}
            <div className={`card mb-6 ${matches.length > 0 ? "border-foreground/50 bg-foreground/5" : "border-warning/50 bg-warning/5"}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{matches.length > 0 ? "✅" : "⚠️"}</span>
                <div>
                  <span className="text-foreground font-bold">
                    {matches.length} correspondance{matches.length !== 1 ? "s" : ""} trouvée{matches.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Highlighted Text */}
            {testString && (
              <div className="card mb-6">
                <h2 className="text-lg font-bold text-accent mb-3">🎯 Résultat</h2>
                <div className="terminal">
                  <div className="terminal-header">
                    <div className="terminal-dot red"></div>
                    <div className="terminal-dot yellow"></div>
                    <div className="terminal-dot green"></div>
                  </div>
                  <div 
                    className="whitespace-pre-wrap break-all font-mono text-sm"
                    dangerouslySetInnerHTML={{ __html: highlightedText }}
                  />
                </div>
              </div>
            )}

            {/* Match Details */}
            {matches.length > 0 && (
              <div className="card mb-6">
                <h2 className="text-lg font-bold text-accent mb-3">📋 Détails des correspondances</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {matches.map((m, i) => (
                    <div key={i} className="p-3 bg-background rounded border border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-foreground/40 text-sm">#{i + 1}</span>
                          <code className="ml-2 text-foreground">&quot;{m.match}&quot;</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground/40 text-xs">index: {m.index}</span>
                          <CopyButton text={m.match} className="text-xs py-0.5 px-2" />
                        </div>
                      </div>
                      {m.groups.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <span className="text-foreground/40 text-xs">Groupes:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {m.groups.map((g, gi) => (
                              <code key={gi} className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                                ${gi + 1}: {g || "(vide)"}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Replace */}
            <div className="card mb-6">
              <h2 className="text-lg font-bold text-accent mb-3">🔄 Remplacer</h2>
              <input
                type="text"
                value={replaceWith}
                onChange={(e) => setReplaceWith(e.target.value)}
                placeholder="Texte de remplacement..."
                className="w-full font-mono text-sm mb-2"
              />
              <p className="text-xs text-foreground/40 mb-3">
                💡 <strong>$1, $2, $3...</strong> = contenu des groupes capturés avec <code className="text-accent">()</code> dans votre regex.
                Ex: regex <code className="text-accent">(\w+)@(\w+)</code> sur &quot;jean@mail&quot; → $1=jean, $2=mail
              </p>
              {replacedText && replaceWith && (
                <div className="terminal">
                  <div className="terminal-header">
                    <div className="terminal-dot red"></div>
                    <div className="terminal-dot yellow"></div>
                    <div className="terminal-dot green"></div>
                  </div>
                  <div className="whitespace-pre-wrap break-all font-mono text-sm">
                    {replacedText}
                  </div>
                </div>
              )}
              {replacedText && replaceWith && (
                <div className="mt-3">
                  <CopyButton text={replacedText} className="w-full" />
                </div>
              )}
            </div>
          </>
        )}

        {/* Cheat Sheet */}
        <div className="card">
          <h2 className="text-lg font-bold text-accent mb-3">📖 Aide-mémoire</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">.</code>
              <span className="text-foreground/40 ml-2">Tout caractère</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">\\d</code>
              <span className="text-foreground/40 ml-2">Chiffre [0-9]</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">\\w</code>
              <span className="text-foreground/40 ml-2">Mot [a-zA-Z0-9_]</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">\\s</code>
              <span className="text-foreground/40 ml-2">Espace blanc</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">^</code>
              <span className="text-foreground/40 ml-2">Début</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">$</code>
              <span className="text-foreground/40 ml-2">Fin</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">*</code>
              <span className="text-foreground/40 ml-2">0 ou plus</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">+</code>
              <span className="text-foreground/40 ml-2">1 ou plus</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">?</code>
              <span className="text-foreground/40 ml-2">0 ou 1</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">{"{n}"}</code>
              <span className="text-foreground/40 ml-2">Exactement n</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">[abc]</code>
              <span className="text-foreground/40 ml-2">a, b ou c</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">(groupe)</code>
              <span className="text-foreground/40 ml-2">Capture</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

