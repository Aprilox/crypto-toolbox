"use client";

import { useState, useMemo } from "react";
import CopyButton from "@/app/components/CopyButton";

interface ParsedUrl {
  href: string;
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  searchParams: [string, string][];
}

export default function UrlTool() {
  const [url, setUrl] = useState("");
  const [newParam, setNewParam] = useState({ key: "", value: "" });

  const parsed = useMemo((): ParsedUrl | null => {
    if (!url.trim()) return null;

    try {
      // Add protocol if missing
      let urlToparse = url;
      if (!url.match(/^[a-zA-Z]+:\/\//)) {
        urlToparse = "https://" + url;
      }

      const parsed = new URL(urlToparse);
      const searchParams: [string, string][] = [];
      parsed.searchParams.forEach((value, key) => {
        searchParams.push([key, value]);
      });

      return {
        href: parsed.href,
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
        origin: parsed.origin,
        searchParams,
      };
    } catch {
      return null;
    }
  }, [url]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _buildUrl = (modifications: Partial<ParsedUrl> = {}): string => {
    if (!parsed) return "";
    
    try {
      const newUrl = new URL(parsed.href);
      
      if (modifications.protocol) newUrl.protocol = modifications.protocol;
      if (modifications.hostname) newUrl.hostname = modifications.hostname;
      if (modifications.port !== undefined) newUrl.port = modifications.port;
      if (modifications.pathname) newUrl.pathname = modifications.pathname;
      if (modifications.hash !== undefined) newUrl.hash = modifications.hash;
      
      return newUrl.href;
    } catch {
      return parsed.href;
    }
  };

  const addParam = () => {
    if (!newParam.key || !parsed) return;
    
    try {
      const newUrl = new URL(parsed.href);
      newUrl.searchParams.append(newParam.key, newParam.value);
      setUrl(newUrl.href);
      setNewParam({ key: "", value: "" });
    } catch {
      // ignore
    }
  };

  const removeParam = (key: string) => {
    if (!parsed) return;
    
    try {
      const newUrl = new URL(parsed.href);
      newUrl.searchParams.delete(key);
      setUrl(newUrl.href);
    } catch {
      // ignore
    }
  };

  const encodeUrl = () => {
    setUrl(encodeURIComponent(url));
  };

  const decodeUrl = () => {
    try {
      setUrl(decodeURIComponent(url));
    } catch {
      // Invalid encoding
    }
  };

  const sampleUrls = [
    "https://example.com/path/to/page?name=John&age=30#section",
    "https://api.github.com/users/octocat/repos?page=1&per_page=10",
    "https://www.google.com/search?q=crypto+toolbox&hl=fr",
  ];

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">🌐 URL</span>
            <span className="text-accent"> Parser</span>
          </h1>
          <p className="text-foreground/60">
            Décomposez et analysez les URLs en détail
          </p>
        </div>

        {/* URL Input */}
        <div className="card mb-6">
          <label className="block text-foreground/80 mb-2">URL à analyser</label>
          <textarea
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/path?param=value#hash"
            className="w-full h-20 resize-none font-mono text-sm"
            spellCheck={false}
          />
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={encodeUrl} className="btn text-sm py-1">
              🔒 Encoder
            </button>
            <button onClick={decodeUrl} className="btn text-sm py-1">
              🔓 Décoder
            </button>
            <button onClick={() => setUrl("")} className="btn btn-cyan text-sm py-1">
              🗑️ Effacer
            </button>
          </div>
        </div>

        {/* Sample URLs */}
        <div className="card mb-6">
          <h2 className="text-sm font-bold text-accent mb-2">📝 Exemples</h2>
          <div className="flex flex-wrap gap-2">
            {sampleUrls.map((sample, i) => (
              <button
                key={i}
                onClick={() => setUrl(sample)}
                className="text-xs px-2 py-1 rounded border border-border text-foreground/40 hover:text-foreground hover:border-foreground/50 transition-all truncate max-w-[200px]"
                title={sample}
              >
                {sample.substring(0, 30)}...
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {url && !parsed && (
          <div className="card mb-6 border-error bg-error/10">
            <p className="text-error">❌ URL invalide</p>
          </div>
        )}

        {/* Parsed Results */}
        {parsed && (
          <>
            {/* Visual Breakdown */}
            <div className="card mb-6">
              <h2 className="text-lg font-bold text-accent mb-4">🔍 Décomposition</h2>
              <div className="terminal overflow-x-auto">
                <div className="terminal-header">
                  <div className="terminal-dot red"></div>
                  <div className="terminal-dot yellow"></div>
                  <div className="terminal-dot green"></div>
                </div>
                <div className="font-mono text-sm whitespace-nowrap">
                  <span className="text-purple-400">{parsed.protocol}</span>
                  <span className="text-foreground/40">{"//"}</span>
                  <span className="text-cyan-400">{parsed.hostname}</span>
                  {parsed.port && <span className="text-yellow-400">:{parsed.port}</span>}
                  <span className="text-green-400">{parsed.pathname}</span>
                  {parsed.search && <span className="text-orange-400">{parsed.search}</span>}
                  {parsed.hash && <span className="text-pink-400">{parsed.hash}</span>}
                </div>
              </div>
            </div>

            {/* Components */}
            <div className="card mb-6">
              <h2 className="text-lg font-bold text-accent mb-4">📋 Composants</h2>
              <div className="space-y-3">
                {[
                  { label: "Protocol", value: parsed.protocol, color: "text-purple-400" },
                  { label: "Hostname", value: parsed.hostname, color: "text-cyan-400" },
                  { label: "Port", value: parsed.port || "(défaut)", color: "text-yellow-400" },
                  { label: "Pathname", value: parsed.pathname, color: "text-green-400" },
                  { label: "Search", value: parsed.search || "(aucun)", color: "text-orange-400" },
                  { label: "Hash", value: parsed.hash || "(aucun)", color: "text-pink-400" },
                  { label: "Origin", value: parsed.origin, color: "text-foreground" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-2 bg-background rounded">
                    <span className="text-foreground/40 w-24 text-sm">{item.label}</span>
                    <code className={`flex-1 ${item.color} text-sm truncate`}>{item.value}</code>
                    {item.value && !item.value.includes("(") && (
                      <CopyButton text={item.value} className="text-xs py-0.5 px-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Query Parameters */}
            <div className="card mb-6">
              <h2 className="text-lg font-bold text-accent mb-4">🔧 Paramètres de requête</h2>
              
              {parsed.searchParams.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {parsed.searchParams.map(([key, value], i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-background rounded">
                      <code className="text-accent">{key}</code>
                      <span className="text-foreground/40">=</span>
                      <code className="flex-1 text-foreground truncate">{value}</code>
                      <CopyButton text={value} className="text-xs py-0.5 px-2" />
                      <button
                        onClick={() => removeParam(key)}
                        className="text-error hover:bg-error/20 px-2 py-0.5 rounded text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-foreground/40 text-sm mb-4">Aucun paramètre</p>
              )}

              {/* Add Parameter */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newParam.key}
                  onChange={(e) => setNewParam({ ...newParam, key: e.target.value })}
                  placeholder="Clé"
                  className="flex-1 text-sm"
                />
                <input
                  type="text"
                  value={newParam.value}
                  onChange={(e) => setNewParam({ ...newParam, value: e.target.value })}
                  placeholder="Valeur"
                  className="flex-1 text-sm"
                />
                <button onClick={addParam} className="btn text-sm py-1">
                  + Ajouter
                </button>
              </div>
            </div>

            {/* Full URL */}
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-accent">🔗 URL complète</h2>
                <CopyButton text={parsed.href} />
              </div>
              <div className="terminal">
                <div className="terminal-header">
                  <div className="terminal-dot red"></div>
                  <div className="terminal-dot yellow"></div>
                  <div className="terminal-dot green"></div>
                </div>
                <code className="text-sm break-all">{parsed.href}</code>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!url && (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4 opacity-30">🌐</div>
            <p className="text-foreground/30">
              Entrez une URL pour l&apos;analyser
            </p>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ Structure d&apos;une URL</h3>
          <code className="text-foreground/60 text-sm block">
            <span className="text-purple-400">protocol</span>://
            <span className="text-cyan-400">hostname</span>:
            <span className="text-yellow-400">port</span>
            <span className="text-green-400">/pathname</span>
            <span className="text-orange-400">?query=params</span>
            <span className="text-pink-400">#hash</span>
          </code>
        </div>
      </div>
    </div>
  );
}

