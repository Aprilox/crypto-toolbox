"use client";

import { useState } from "react";
import CryptoJS from "crypto-js";
import CopyButton from "@/app/components/CopyButton";

type Mode = "encrypt" | "decrypt";
type Algorithm = "AES" | "DES" | "TripleDES" | "Rabbit" | "RC4";

interface AlgorithmInfo {
  name: string;
  description: string;
  keySize: string;
  security: "high" | "medium" | "low" | "deprecated";
}

const algorithms: Record<Algorithm, AlgorithmInfo> = {
  AES: {
    name: "AES-256",
    description: "Advanced Encryption Standard",
    keySize: "256 bits",
    security: "high",
  },
  DES: {
    name: "DES",
    description: "Data Encryption Standard",
    keySize: "56 bits",
    security: "deprecated",
  },
  TripleDES: {
    name: "Triple DES (3DES)",
    description: "Triple Data Encryption Standard",
    keySize: "168 bits",
    security: "medium",
  },
  Rabbit: {
    name: "Rabbit",
    description: "Stream cipher haute performance",
    keySize: "128 bits",
    security: "high",
  },
  RC4: {
    name: "RC4",
    description: "Rivest Cipher 4 (stream cipher)",
    keySize: "Variable",
    security: "deprecated",
  },
};

const securityColors = {
  high: "text-foreground",
  medium: "text-warning",
  low: "text-warning",
  deprecated: "text-error",
};

const securityLabels = {
  high: "🛡️ Haute sécurité",
  medium: "⚠️ Sécurité moyenne",
  low: "⚠️ Faible sécurité",
  deprecated: "❌ Déprécié",
};

export default function EncryptTool() {
  const [input, setInput] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<Mode>("encrypt");
  const [algorithm, setAlgorithm] = useState<Algorithm>("AES");
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);

  const processText = () => {
    setError("");
    
    if (!input.trim()) {
      setError("Veuillez entrer du texte");
      return;
    }

    if (!secretKey.trim()) {
      setError("Veuillez entrer une clé secrète");
      return;
    }

    try {
      let result: string;

      if (mode === "encrypt") {
        switch (algorithm) {
          case "AES":
            result = CryptoJS.AES.encrypt(input, secretKey).toString();
            break;
          case "DES":
            result = CryptoJS.DES.encrypt(input, secretKey).toString();
            break;
          case "TripleDES":
            result = CryptoJS.TripleDES.encrypt(input, secretKey).toString();
            break;
          case "Rabbit":
            result = CryptoJS.Rabbit.encrypt(input, secretKey).toString();
            break;
          case "RC4":
            result = CryptoJS.RC4.encrypt(input, secretKey).toString();
            break;
          default:
            result = CryptoJS.AES.encrypt(input, secretKey).toString();
        }
        setOutput(result);
      } else {
        let decrypted: CryptoJS.lib.WordArray;
        
        switch (algorithm) {
          case "AES":
            decrypted = CryptoJS.AES.decrypt(input, secretKey);
            break;
          case "DES":
            decrypted = CryptoJS.DES.decrypt(input, secretKey);
            break;
          case "TripleDES":
            decrypted = CryptoJS.TripleDES.decrypt(input, secretKey);
            break;
          case "Rabbit":
            decrypted = CryptoJS.Rabbit.decrypt(input, secretKey);
            break;
          case "RC4":
            decrypted = CryptoJS.RC4.decrypt(input, secretKey);
            break;
          default:
            decrypted = CryptoJS.AES.decrypt(input, secretKey);
        }
        
        result = decrypted.toString(CryptoJS.enc.Utf8);
        
        if (!result) {
          throw new Error("Impossible de déchiffrer. Vérifiez l'algorithme, la clé et le texte chiffré.");
        }
        
        setOutput(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du traitement");
      setOutput("");
    }
  };

  const generateRandomKey = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const key = Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setSecretKey(key);
  };

  const swapMode = () => {
    setInput(output);
    setOutput("");
    setMode(mode === "encrypt" ? "decrypt" : "encrypt");
    setError("");
  };

  const currentAlgo = algorithms[algorithm];

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">🛡️ Encrypt</span>
            <span className="text-accent"> / Decrypt</span>
          </h1>
          <p className="text-foreground/60">
            Chiffrez et déchiffrez vos données avec plusieurs algorithmes
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="card mb-6">
          <div className="flex rounded overflow-hidden border border-border">
            <button
              onClick={() => { setMode("encrypt"); setOutput(""); setError(""); }}
              className={`flex-1 py-3 px-4 transition-all ${
                mode === "encrypt"
                  ? "bg-foreground text-background"
                  : "hover:bg-muted text-foreground/60"
              }`}
            >
              🔐 Chiffrer
            </button>
            <button
              onClick={() => { setMode("decrypt"); setOutput(""); setError(""); }}
              className={`flex-1 py-3 px-4 transition-all ${
                mode === "decrypt"
                  ? "bg-foreground text-background"
                  : "hover:bg-muted text-foreground/60"
              }`}
            >
              🔓 Déchiffrer
            </button>
          </div>
        </div>

        {/* Algorithm Selection */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-accent mb-4">Algorithme de chiffrement</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.keys(algorithms) as Algorithm[]).map((algo) => {
              const info = algorithms[algo];
              return (
                <button
                  key={algo}
                  onClick={() => { setAlgorithm(algo); setOutput(""); setError(""); }}
                  className={`p-3 rounded border transition-all text-left ${
                    algorithm === algo
                      ? "border-foreground bg-foreground/10"
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  <div className="font-bold text-foreground text-sm">{info.name}</div>
                  <div className="text-xs text-foreground/40 mt-1">{info.keySize}</div>
                  <div className={`text-xs mt-1 ${securityColors[info.security]}`}>
                    {info.security === "high" && "✓ Sécurisé"}
                    {info.security === "medium" && "⚠ Moyen"}
                    {info.security === "deprecated" && "⚠ Déprécié"}
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Algorithm Info */}
          <div className={`mt-4 p-3 rounded border ${
            currentAlgo.security === "deprecated" ? "border-error bg-error/10" :
            currentAlgo.security === "medium" ? "border-warning bg-warning/10" :
            "border-foreground/30 bg-foreground/5"
          }`}>
            <div className="flex items-center gap-2">
              <span className={securityColors[currentAlgo.security]}>
                {securityLabels[currentAlgo.security]}
              </span>
            </div>
            <p className="text-foreground/60 text-sm mt-1">
              {currentAlgo.description} • Taille de clé: {currentAlgo.keySize}
            </p>
            {currentAlgo.security === "deprecated" && (
              <p className="text-error text-xs mt-2">
                ⚠️ Cet algorithme n&apos;est plus considéré sûr. Utilisez AES pour une sécurité optimale.
              </p>
            )}
          </div>
        </div>

        {/* Secret Key */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-foreground/80">Clé secrète</label>
            <button
              onClick={generateRandomKey}
              className="text-sm text-accent hover:text-foreground transition-colors"
            >
              🎲 Générer une clé
            </button>
          </div>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Entrez votre clé secrète..."
              className="w-full pr-12"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
              title={showKey ? "Masquer" : "Afficher"}
            >
              {showKey ? "🙈" : "👁️"}
            </button>
          </div>
          <p className="text-xs text-foreground/40 mt-2">
            ⚠️ Conservez cette clé en lieu sûr. Sans elle, impossible de déchiffrer vos données.
          </p>
        </div>

        {/* Input */}
        <div className="card mb-6">
          <label className="block text-foreground/80 mb-2">
            {mode === "encrypt" ? "Texte à chiffrer" : "Texte à déchiffrer"}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encrypt" ? "Entrez le texte à protéger..." : "Entrez le texte chiffré..."}
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
            ⚡ {mode === "encrypt" ? "Chiffrer" : "Déchiffrer"} avec {algorithms[algorithm].name}
          </button>
          {output && (
            <button onClick={swapMode} className="btn btn-cyan" title="Inverser">
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
        </div>

        {/* Info */}
        <div className="mt-8 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ À propos des algorithmes</h3>
          <ul className="text-foreground/60 text-sm space-y-2">
            <li>• <strong className="text-foreground">AES-256</strong> : Standard mondial, recommandé pour toute utilisation sécurisée</li>
            <li>• <strong className="text-foreground">Triple DES</strong> : Successeur de DES, acceptable mais plus lent qu&apos;AES</li>
            <li>• <strong className="text-foreground">Rabbit</strong> : Chiffrement par flux rapide, bonne sécurité</li>
            <li>• <strong className="text-warning">DES</strong> : Obsolète, clé trop courte (56 bits), à éviter</li>
            <li>• <strong className="text-warning">RC4</strong> : Vulnérabilités connues, déconseillé</li>
          </ul>
          <p className="text-foreground/40 text-xs mt-3">
            Tous les calculs sont effectués localement dans votre navigateur.
          </p>
        </div>
      </div>
    </div>
  );
}
