"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";

type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

// Capacité maximale approximative par niveau de correction (caractères alphanumériques)
const maxCapacity: Record<ErrorCorrectionLevel, number> = {
  L: 4296,
  M: 3391,
  Q: 2420,
  H: 1852,
};

// Seuils de warning pour la lisibilité
const warningThresholds = {
  moderate: 500,  // Texte modéré
  high: 1000,     // Texte long
  veryHigh: 2000, // Très long
};

export default function QRCodeTool() {
  const [text, setText] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [size, setSize] = useState(256);
  const [errorCorrection, setErrorCorrection] = useState<ErrorCorrectionLevel>("M");
  const [darkColor, setDarkColor] = useState("#00ff41");
  const [lightColor, setLightColor] = useState("#0a0f0a");
  const [transparentBg, setTransparentBg] = useState(false);
  const [margin, setMargin] = useState(2);
  const [error, setError] = useState("");
  const [qrVersion, setQrVersion] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculer le niveau de warning basé sur la longueur du texte
  const getTextWarning = useCallback(() => {
    const len = text.length;
    const max = maxCapacity[errorCorrection];
    
    if (len === 0) return null;
    if (len > max) return { level: "error", message: `Texte trop long ! Maximum ${max} caractères pour ce niveau de correction.` };
    if (len > warningThresholds.veryHigh) return { level: "high", message: "QR code très dense. Augmentez la taille ou réduisez le texte pour une meilleure lisibilité." };
    if (len > warningThresholds.high) return { level: "moderate", message: "QR code dense. Considérez augmenter la taille pour faciliter le scan." };
    if (len > warningThresholds.moderate) return { level: "low", message: "Texte modérément long. Le QR code reste lisible." };
    return null;
  }, [text, errorCorrection]);

  // Calculer la version estimée du QR code
  const estimateVersion = useCallback((length: number) => {
    if (length === 0) return null;
    // Estimation simplifiée basée sur la longueur
    if (length <= 25) return 1;
    if (length <= 47) return 2;
    if (length <= 77) return 3;
    if (length <= 114) return 4;
    if (length <= 154) return 5;
    if (length <= 195) return 6;
    if (length <= 367) return 10;
    if (length <= 652) return 15;
    if (length <= 1066) return 20;
    if (length <= 1628) return 25;
    if (length <= 2334) return 30;
    if (length <= 3057) return 35;
    return 40;
  }, []);

  useEffect(() => {
    if (!text.trim()) {
      setQrDataUrl(null);
      setError("");
      setQrVersion(null);
      return;
    }

    const generateQR = async () => {
      try {
        // Vérifier la capacité
        if (text.length > maxCapacity[errorCorrection]) {
          setError(`Texte trop long pour le niveau de correction ${errorCorrection}. Maximum: ${maxCapacity[errorCorrection]} caractères.`);
          setQrDataUrl(null);
          return;
        }

        const options: QRCode.QRCodeToDataURLOptions = {
          width: size,
          margin: margin,
          errorCorrectionLevel: errorCorrection,
          color: {
            dark: darkColor,
            light: transparentBg ? "#00000000" : lightColor,
          },
        };

        const dataUrl = await QRCode.toDataURL(text, options);
        setQrDataUrl(dataUrl);
        setError("");
        setQrVersion(estimateVersion(text.length));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de la génération");
        setQrDataUrl(null);
      }
    };

    generateQR();
  }, [text, size, errorCorrection, darkColor, lightColor, transparentBg, margin, estimateVersion]);

  const downloadQR = async (format: "png" | "svg") => {
    if (!text.trim()) return;

    if (format === "svg") {
      try {
        const svg = await QRCode.toString(text, {
          type: "svg",
          margin: margin,
          errorCorrectionLevel: errorCorrection,
          color: {
            dark: darkColor,
            light: transparentBg ? "#00000000" : lightColor,
          },
        });
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `qrcode-${Date.now()}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de la génération SVG");
      }
    } else {
      if (!qrDataUrl) return;
      const link = document.createElement("a");
      link.download = `qrcode-${Date.now()}.png`;
      link.href = qrDataUrl;
      link.click();
    }
  };

  const errorLevels: { value: ErrorCorrectionLevel; label: string; description: string; capacity: number }[] = [
    { value: "L", label: "Low (7%)", description: "Plus de données", capacity: maxCapacity.L },
    { value: "M", label: "Medium (15%)", description: "Équilibré", capacity: maxCapacity.M },
    { value: "Q", label: "Quartile (25%)", description: "Bonne correction", capacity: maxCapacity.Q },
    { value: "H", label: "High (30%)", description: "Max correction", capacity: maxCapacity.H },
  ];

  const presetColors = [
    { dark: "#00ff41", light: "#0a0f0a", name: "Matrix" },
    { dark: "#00d4ff", light: "#0a0f0a", name: "Cyan" },
    { dark: "#ffffff", light: "#000000", name: "Classique" },
    { dark: "#000000", light: "#ffffff", name: "Inversé" },
    { dark: "#ff3333", light: "#1a0000", name: "Alerte" },
    { dark: "#ffaa00", light: "#1a1200", name: "Ambre" },
  ];

  const textWarning = getTextWarning();
  const capacityPercent = text.length > 0 ? Math.min((text.length / maxCapacity[errorCorrection]) * 100, 100) : 0;

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
            Créez des QR codes personnalisés avec téléchargement PNG/SVG
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
          
          {/* Character count and capacity bar */}
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-foreground/40">
                {text.length} / {maxCapacity[errorCorrection]} caractères
              </span>
              {text && (
                <button 
                  onClick={() => setText("")}
                  className="text-sm text-foreground/40 hover:text-foreground transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>
            
            {/* Capacity progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  capacityPercent > 90 ? "bg-error" :
                  capacityPercent > 70 ? "bg-warning" :
                  capacityPercent > 50 ? "bg-accent" : "bg-foreground"
                }`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>

          {/* Warning message */}
          {textWarning && (
            <div className={`mt-3 p-3 rounded border ${
              textWarning.level === "error" ? "border-error bg-error/10" :
              textWarning.level === "high" ? "border-warning bg-warning/10" :
              "border-accent/50 bg-accent/5"
            }`}>
              <p className={`text-sm ${
                textWarning.level === "error" ? "text-error" :
                textWarning.level === "high" ? "text-warning" : "text-accent"
              }`}>
                {textWarning.level === "error" ? "❌" : textWarning.level === "high" ? "⚠️" : "ℹ️"} {textWarning.message}
              </p>
            </div>
          )}
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
              max="1024"
              step="32"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-foreground/40 mt-1">
              <span>128px</span>
              <span>1024px</span>
            </div>
          </div>

          {/* Margin */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <label className="text-foreground/80">Marge (quiet zone)</label>
              <span className="text-foreground font-bold">{margin} modules</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-foreground/40 mt-1">
              <span>0 (aucune)</span>
              <span>10</span>
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

          {/* Transparent Background Toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
              />
              <div>
                <span className="text-foreground/80">Fond transparent</span>
                <p className="text-xs text-foreground/40">Idéal pour superposer sur d&apos;autres images</p>
              </div>
            </label>
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
                    setTransparentBg(false);
                  }}
                  className={`p-3 rounded border transition-all ${
                    darkColor === preset.dark && lightColor === preset.light && !transparentBg
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
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${transparentBg ? "opacity-50" : ""}`}>
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
              <label className="text-foreground/80 text-sm block mb-2">
                Couleur fond {transparentBg && <span className="text-accent">(transparent)</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={lightColor}
                  onChange={(e) => { setLightColor(e.target.value); setTransparentBg(false); }}
                  className="w-12 h-10 rounded cursor-pointer border-0 p-0"
                  disabled={transparentBg}
                />
                <input
                  type="text"
                  value={transparentBg ? "transparent" : lightColor}
                  onChange={(e) => { setLightColor(e.target.value); setTransparentBg(false); }}
                  className="flex-1 text-sm"
                  disabled={transparentBg}
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-accent">Aperçu</h2>
            {qrVersion && (
              <span className="text-sm text-foreground/40">
                Version {qrVersion} • {Math.pow(qrVersion * 4 + 17, 2)} modules
              </span>
            )}
          </div>
          
          <div 
            className={`flex items-center justify-center p-8 rounded border border-border mb-4 ${
              transparentBg ? "bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#2a2a2a_0%_50%)] bg-[length:20px_20px]" : ""
            }`}
            style={{ backgroundColor: transparentBg ? undefined : lightColor }}
          >
            {qrDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
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
            <div className="flex gap-3">
              <button onClick={() => downloadQR("png")} className="btn flex-1">
                📥 PNG
              </button>
              <button onClick={() => downloadQR("svg")} className="btn btn-cyan flex-1">
                📥 SVG
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        {text.length > 0 && (
          <div className="card mt-6">
            <h3 className="text-accent font-bold mb-3">📊 Statistiques</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-background rounded border border-border">
                <div className="text-2xl font-bold text-foreground">{text.length}</div>
                <div className="text-xs text-foreground/40">Caractères</div>
              </div>
              <div className="p-3 bg-background rounded border border-border">
                <div className="text-2xl font-bold text-foreground">v{qrVersion || "?"}</div>
                <div className="text-xs text-foreground/40">Version QR</div>
              </div>
              <div className="p-3 bg-background rounded border border-border">
                <div className="text-2xl font-bold text-foreground">{size}</div>
                <div className="text-xs text-foreground/40">Pixels</div>
              </div>
              <div className="p-3 bg-background rounded border border-border">
                <div className={`text-2xl font-bold ${
                  capacityPercent > 90 ? "text-error" :
                  capacityPercent > 70 ? "text-warning" : "text-foreground"
                }`}>{capacityPercent.toFixed(0)}%</div>
                <div className="text-xs text-foreground/40">Capacité</div>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ Conseils pour la lisibilité</h3>
          <ul className="text-foreground/60 text-sm space-y-2">
            <li>• <strong>Texte court</strong> = QR code plus simple et plus facile à scanner</li>
            <li>• <strong>Utilisez des URL courtes</strong> ou des raccourcisseurs pour les liens longs</li>
            <li>• <strong>Taille recommandée</strong> : minimum 2cm x 2cm pour l&apos;impression</li>
            <li>• <strong>Correction L</strong> : plus de données mais moins de tolérance aux dommages</li>
            <li>• <strong>Correction H</strong> : moins de données mais peut être scanné même abîmé à 30%</li>
            <li>• <strong>Contraste élevé</strong> : assurez un bon contraste entre le QR et le fond</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
