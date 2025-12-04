"use client";

import { useState, useEffect } from "react";
import CopyButton from "@/app/components/CopyButton";

interface ColorValues {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  hsv: { h: number; s: number; v: number };
  cmyk: { c: number; m: number; y: number; k: number };
}

export default function ColorTool() {
  const [color, setColor] = useState<ColorValues>({
    hex: "#00ff41",
    rgb: { r: 0, g: 255, b: 65 },
    hsl: { h: 135, s: 100, l: 50 },
    hsv: { h: 135, s: 100, v: 100 },
    cmyk: { c: 100, m: 0, y: 75, k: 0 },
  });

  const [inputHex, setInputHex] = useState("#00ff41");

  // Conversion functions
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  };

  const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  };

  const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  };

  const rgbToHsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    const v = max;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;

    if (max !== min) {
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      v: Math.round(v * 100),
    };
  };

  const rgbToCmyk = (r: number, g: number, b: number): { c: number; m: number; y: number; k: number } => {
    if (r === 0 && g === 0 && b === 0) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }

    const c = 1 - r / 255;
    const m = 1 - g / 255;
    const y = 1 - b / 255;
    const k = Math.min(c, m, y);

    return {
      c: Math.round(((c - k) / (1 - k)) * 100),
      m: Math.round(((m - k) / (1 - k)) * 100),
      y: Math.round(((y - k) / (1 - k)) * 100),
      k: Math.round(k * 100),
    };
  };

  const updateFromHex = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return;

    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

    setColor({ hex: hex.toUpperCase(), rgb, hsl, hsv, cmyk });
    setInputHex(hex);
  };

  const updateFromRgb = (r: number, g: number, b: number) => {
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    const hex = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);
    const hsv = rgbToHsv(r, g, b);
    const cmyk = rgbToCmyk(r, g, b);

    setColor({ hex: hex.toUpperCase(), rgb: { r, g, b }, hsl, hsv, cmyk });
    setInputHex(hex);
  };

  const updateFromHsl = (h: number, s: number, l: number) => {
    h = Math.max(0, Math.min(360, h));
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));

    const rgb = hslToRgb(h, s, l);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

    setColor({ hex: hex.toUpperCase(), rgb, hsl: { h, s, l }, hsv, cmyk });
    setInputHex(hex);
  };

  const handleHexInput = (value: string) => {
    setInputHex(value);
    if (/^#?[0-9A-Fa-f]{6}$/.test(value)) {
      updateFromHex(value.startsWith("#") ? value : `#${value}`);
    }
  };

  const randomColor = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    updateFromRgb(r, g, b);
  };

  const presetColors = [
    "#00ff41", "#00d4ff", "#ff3333", "#ffaa00", "#ff00ff", "#00ffff",
    "#ffffff", "#000000", "#808080", "#ff0000", "#00ff00", "#0000ff",
  ];

  // Calculate contrast color for text
  const getContrastColor = (hex: string): string => {
    const rgb = hexToRgb(hex);
    if (!rgb) return "#000000";
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? "#000000" : "#ffffff";
  };

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">🎨 Color</span>
            <span className="text-accent"> Converter</span>
          </h1>
          <p className="text-foreground/60">
            Convertissez entre HEX, RGB, HSL, HSV et CMYK
          </p>
        </div>

        {/* Color Preview */}
        <div className="card mb-6">
          <div
            className="h-32 rounded-lg mb-4 flex items-center justify-center text-2xl font-bold transition-all"
            style={{ backgroundColor: color.hex, color: getContrastColor(color.hex) }}
          >
            {color.hex}
          </div>
          
          <div className="flex gap-2 mb-4">
            <button onClick={randomColor} className="btn flex-1">
              🎲 Aléatoire
            </button>
            <input
              type="color"
              value={color.hex}
              onChange={(e) => updateFromHex(e.target.value)}
              className="w-16 h-10 rounded cursor-pointer border-0 p-0"
            />
          </div>

          {/* Preset Colors */}
          <div className="flex flex-wrap gap-2">
            {presetColors.map((c) => (
              <button
                key={c}
                onClick={() => updateFromHex(c)}
                className={`w-8 h-8 rounded border-2 transition-all ${
                  color.hex.toUpperCase() === c.toUpperCase()
                    ? "border-foreground scale-110"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* HEX */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-foreground/80 font-bold">HEX</label>
            <CopyButton text={color.hex} className="text-xs py-0.5 px-2" />
          </div>
          <input
            type="text"
            value={inputHex}
            onChange={(e) => handleHexInput(e.target.value)}
            placeholder="#00ff41"
            className="w-full font-mono"
          />
        </div>

        {/* RGB */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-foreground/80 font-bold">RGB</label>
            <CopyButton text={`rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`} className="text-xs py-0.5 px-2" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-foreground/40">R</label>
              <input
                type="number"
                min="0"
                max="255"
                value={color.rgb.r}
                onChange={(e) => updateFromRgb(Number(e.target.value), color.rgb.g, color.rgb.b)}
                className="w-full font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-foreground/40">G</label>
              <input
                type="number"
                min="0"
                max="255"
                value={color.rgb.g}
                onChange={(e) => updateFromRgb(color.rgb.r, Number(e.target.value), color.rgb.b)}
                className="w-full font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-foreground/40">B</label>
              <input
                type="number"
                min="0"
                max="255"
                value={color.rgb.b}
                onChange={(e) => updateFromRgb(color.rgb.r, color.rgb.g, Number(e.target.value))}
                className="w-full font-mono"
              />
            </div>
          </div>
        </div>

        {/* HSL */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-foreground/80 font-bold">HSL</label>
            <CopyButton text={`hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`} className="text-xs py-0.5 px-2" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-foreground/40">H (0-360)</label>
              <input
                type="number"
                min="0"
                max="360"
                value={color.hsl.h}
                onChange={(e) => updateFromHsl(Number(e.target.value), color.hsl.s, color.hsl.l)}
                className="w-full font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-foreground/40">S (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={color.hsl.s}
                onChange={(e) => updateFromHsl(color.hsl.h, Number(e.target.value), color.hsl.l)}
                className="w-full font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-foreground/40">L (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={color.hsl.l}
                onChange={(e) => updateFromHsl(color.hsl.h, color.hsl.s, Number(e.target.value))}
                className="w-full font-mono"
              />
            </div>
          </div>
        </div>

        {/* HSV */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-foreground/80 font-bold">HSV / HSB</label>
            <CopyButton text={`hsv(${color.hsv.h}, ${color.hsv.s}%, ${color.hsv.v}%)`} className="text-xs py-0.5 px-2" />
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-2 bg-background rounded">
              <span className="text-foreground/40">H:</span> <span className="text-foreground">{color.hsv.h}°</span>
            </div>
            <div className="p-2 bg-background rounded">
              <span className="text-foreground/40">S:</span> <span className="text-foreground">{color.hsv.s}%</span>
            </div>
            <div className="p-2 bg-background rounded">
              <span className="text-foreground/40">V:</span> <span className="text-foreground">{color.hsv.v}%</span>
            </div>
          </div>
        </div>

        {/* CMYK */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <label className="text-foreground/80 font-bold">CMYK</label>
            <CopyButton text={`cmyk(${color.cmyk.c}%, ${color.cmyk.m}%, ${color.cmyk.y}%, ${color.cmyk.k}%)`} className="text-xs py-0.5 px-2" />
          </div>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="p-2 bg-background rounded text-center">
              <span className="text-cyan-400 font-bold">{color.cmyk.c}%</span>
              <div className="text-foreground/40 text-xs">Cyan</div>
            </div>
            <div className="p-2 bg-background rounded text-center">
              <span className="text-pink-400 font-bold">{color.cmyk.m}%</span>
              <div className="text-foreground/40 text-xs">Magenta</div>
            </div>
            <div className="p-2 bg-background rounded text-center">
              <span className="text-yellow-400 font-bold">{color.cmyk.y}%</span>
              <div className="text-foreground/40 text-xs">Yellow</div>
            </div>
            <div className="p-2 bg-background rounded text-center">
              <span className="text-foreground font-bold">{color.cmyk.k}%</span>
              <div className="text-foreground/40 text-xs">Key</div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ Espaces colorimétriques</h3>
          <ul className="text-foreground/60 text-sm space-y-1">
            <li>• <strong>HEX</strong> : Format web (#RRGGBB)</li>
            <li>• <strong>RGB</strong> : Rouge, Vert, Bleu (écrans)</li>
            <li>• <strong>HSL</strong> : Teinte, Saturation, Luminosité</li>
            <li>• <strong>HSV/HSB</strong> : Teinte, Saturation, Valeur/Brillance</li>
            <li>• <strong>CMYK</strong> : Cyan, Magenta, Jaune, Noir (impression)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

