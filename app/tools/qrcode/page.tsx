"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";

type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export default function QRCodeTool() {
  const [text, setText] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [size, setSize] = useState(256);
  const [errorCorrection, setErrorCorrection] = useState<ErrorCorrectionLevel>("M");
  const [darkColor, setDarkColor] = useState("#00ff41");
  const [lightColor, setLightColor] = useState("#0a0f0a");
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!text.trim()) {
      setQrDataUrl(null);
      setError("");
      return;
    }

    const generateQR = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(text, {
          width: size,
          margin: 2,
          errorCorrectionLevel: errorCorrection,
          color: {
            dark: darkColor,
            light: lightColor,
          },
        });
        setQrDataUrl(dataUrl);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de la génération");
        setQrDataUrl(null);
      }
    };

    generateQR();
  }, [text, size, errorCorrection, darkColor, lightColor]);

  const downloadQR = () => {
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.download = `qrcode-${Date.now()}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const errorLevels: { value: ErrorCorrectionLevel; label: string; description: string }[] = [
    { value: "L", label: "Low (7%)", description: "Récupération minimale" },
    { value: "M", label: "Medium (15%)", description: "Équilibré" },
    { value: "Q", label: "Quartile (25%)", description: "Bonne récupération" },
    { value: "H", label: "High (30%)", description: "Maximum" },
  ];

  const presetColors = [
    { dark: "#00ff41", light: "#0a0f0a", name: "Matrix" },
    { dark: "#00d4ff", light: "#0a0f0a", name: "Cyan" },
    { dark: "#ffffff", light: "#000000", name: "Classique" },
    { dark: "#000000", light: "#ffffff", name: "Inversé" },
    { dark: "#ff3333", light: "#1a0000", name: "Alerte" },
    { dark: "#ffaa00", light: "#1a1200", name: "Ambre" },
  ];

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">📱 QR Code</span>
            <span className="text-accent"> Generator</span>
          </h1>
          <p className="text-foreground/60">
            Créez des QR codes personnalisés avec téléchargement PNG
          </p>
        </div>

        {/* Input */}
        <div className="card mb-6">
          <label className="block text-foreground/80 mb-2">
            Texte ou URL
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Entrez le texte ou l'URL à encoder..."
            className="w-full h-24 resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-foreground/40">{text.length} caractères</span>
            {text && (
              <button 
                onClick={() => setText("")}
                className="text-sm text-foreground/40 hover:text-foreground transition-colors"
              >
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* Options */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-accent mb-4">Options</h2>
          
          {/* Size */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <label className="text-foreground/80">Taille</label>
              <span className="text-foreground font-bold">{size}px</span>
            </div>
            <input
              type="range"
              min="128"
              max="512"
              step="32"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-foreground/40 mt-1">
              <span>128px</span>
              <span>512px</span>
            </div>
          </div>

          {/* Error Correction */}
          <div className="mb-6">
            <label className="text-foreground/80 block mb-2">Correction d&apos;erreur</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {errorLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setErrorCorrection(level.value)}
                  className={`p-3 rounded border transition-all text-left ${
                    errorCorrection === level.value
                      ? "border-foreground bg-foreground/10"
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  <div className="text-sm font-bold text-foreground">{level.label}</div>
                  <div className="text-xs text-foreground/40">{level.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color Presets */}
          <div className="mb-6">
            <label className="text-foreground/80 block mb-2">Thème de couleur</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {presetColors.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setDarkColor(preset.dark);
                    setLightColor(preset.light);
                  }}
                  className={`p-3 rounded border transition-all ${
                    darkColor === preset.dark && lightColor === preset.light
                      ? "border-foreground"
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  <div 
                    className="w-full h-6 rounded mb-1"
                    style={{ 
                      background: `linear-gradient(135deg, ${preset.dark} 50%, ${preset.light} 50%)` 
                    }}
                  />
                  <div className="text-xs text-foreground/60 text-center">{preset.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-foreground/80 text-sm block mb-2">Couleur QR</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  className="flex-1 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-foreground/80 text-sm block mb-2">Couleur fond</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  className="flex-1 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="card mb-6 border-error bg-error/10">
            <p className="text-error">{error}</p>
          </div>
        )}

        {/* QR Code Preview */}
        <div className="card">
          <h2 className="text-lg font-bold text-accent mb-4">Aperçu</h2>
          
          <div 
            className="flex items-center justify-center p-8 rounded border border-border mb-4"
            style={{ backgroundColor: lightColor }}
          >
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="QR Code" 
                className="max-w-full"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4 opacity-30">📱</div>
                <p className="text-foreground/30">
                  Entrez du texte pour générer un QR code
                </p>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {qrDataUrl && (
            <button onClick={downloadQR} className="btn w-full">
              📥 Télécharger PNG
            </button>
          )}
        </div>

        {/* Info */}
        <div className="mt-8 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ À propos des QR codes</h3>
          <ul className="text-foreground/60 text-sm space-y-1">
            <li>• <strong>QR Code</strong> = Quick Response Code, 2D barcode</li>
            <li>• La correction d&apos;erreur permet de lire le code même partiellement endommagé</li>
            <li>• <strong>L</strong> : 7% récupération | <strong>H</strong> : 30% récupération</li>
            <li>• Plus le niveau est élevé, plus le QR code est dense</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

