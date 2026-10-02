"use client";

import { useState, useCallback } from "react";
import CopyButton from "@/app/components/CopyButton";

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

export default function PasswordGenerator() {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(16);
  const [useLowercase, setUseLowercase] = useState(true);
  const [useUppercase, setUseUppercase] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [excludeChars, setExcludeChars] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  const generatePassword = useCallback(() => {
    let chars = "";
    if (useLowercase) chars += LOWERCASE;
    if (useUppercase) chars += UPPERCASE;
    if (useNumbers) chars += NUMBERS;
    if (useSymbols) chars += SYMBOLS;

    // Remove excluded characters
    if (excludeChars) {
      for (const char of excludeChars) {
        chars = chars.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
      }
    }

    if (chars.length === 0) {
      setPassword("Sélectionnez au moins un type de caractère");
      return;
    }

    let newPassword = "";
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      newPassword += chars[array[i] % chars.length];
    }

    setPassword(newPassword);
    setHistory(prev => [newPassword, ...prev.slice(0, 9)]);
  }, [length, useLowercase, useUppercase, useNumbers, useSymbols, excludeChars]);

  const getStrength = () => {
    if (!password || password.includes("Sélectionnez")) return { label: "-", color: "text-foreground/30", width: "0%" };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { label: "Faible", color: "text-error", width: "25%" };
    if (score <= 4) return { label: "Moyen", color: "text-warning", width: "50%" };
    if (score <= 5) return { label: "Fort", color: "text-accent", width: "75%" };
    return { label: "Très Fort", color: "text-foreground", width: "100%" };
  };

  const strength = getStrength();

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">🔐 Password</span>
            <span className="text-accent"> Generator</span>
          </h1>
          <p className="text-foreground/60">
            Générez des mots de passe sécurisés et personnalisés
          </p>
        </div>

        {/* Password Display */}
        <div className="card mb-6">
          <div className="terminal mb-4">
            <div className="terminal-header">
              <div className="terminal-dot red"></div>
              <div className="terminal-dot yellow"></div>
              <div className="terminal-dot green"></div>
            </div>
            <div className="text-lg sm:text-xl break-all min-h-[2rem] flex items-center">
              {password || <span className="text-foreground/30">Cliquez sur Générer...</span>}
            </div>
          </div>

          {/* Strength Indicator */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-foreground/60">Force du mot de passe</span>
              <span className={strength.color}>{strength.label}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  strength.label === "Faible" ? "bg-error" :
                  strength.label === "Moyen" ? "bg-warning" :
                  strength.label === "Fort" ? "bg-accent" : "bg-foreground"
                }`}
                style={{ width: strength.width }}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={generatePassword} className="btn flex-1">
              ⚡ Générer
            </button>
            {password && !password.includes("Sélectionnez") && (
              <CopyButton text={password} />
            )}
          </div>
        </div>

        {/* Options */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold mb-4 text-accent">Options</h2>
          
          {/* Length Slider */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <label className="text-foreground/80">Longueur</label>
              <span className="text-foreground font-bold">{length}</span>
            </div>
            <input
              type="range"
              min="4"
              max="128"
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-foreground/40 mt-1">
              <span>4</span>
              <span>128</span>
            </div>
          </div>

          {/* Character Types */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useLowercase}
                onChange={(e) => setUseLowercase(e.target.checked)}
              />
              <span className="text-foreground/80">Minuscules (a-z)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useUppercase}
                onChange={(e) => setUseUppercase(e.target.checked)}
              />
              <span className="text-foreground/80">Majuscules (A-Z)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useNumbers}
                onChange={(e) => setUseNumbers(e.target.checked)}
              />
              <span className="text-foreground/80">Chiffres (0-9)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useSymbols}
                onChange={(e) => setUseSymbols(e.target.checked)}
              />
              <span className="text-foreground/80">Symboles (!@#...)</span>
            </label>
          </div>

          {/* Exclude Characters */}
          <div>
            <label className="block text-foreground/80 mb-2">
              Exclure ces caractères
            </label>
            <input
              type="text"
              value={excludeChars}
              onChange={(e) => setExcludeChars(e.target.value)}
              placeholder="Ex: 0O1lI"
              className="w-full"
            />
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-bold mb-4 text-accent">Historique</h2>
            <div className="space-y-2">
              {history.map((pwd, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between gap-4 p-3 bg-background rounded border border-border"
                >
                  <code className="text-sm break-all flex-1 text-foreground/80">{pwd}</code>
                  <CopyButton text={pwd} className="text-xs py-1 px-2" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

