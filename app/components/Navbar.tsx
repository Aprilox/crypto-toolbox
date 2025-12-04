"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const toolCategories = [
  {
    name: "Sécurité",
    icon: "🔐",
    tools: [
      { name: "Password Generator", href: "/tools/password", icon: "🔐" },
      { name: "Hash Generator", href: "/tools/hash", icon: "🔒" },
      { name: "Encrypt / Decrypt", href: "/tools/encrypt", icon: "🛡️" },
      { name: "File Checksum", href: "/tools/checksum", icon: "📁" },
    ],
  },
  {
    name: "Encodage",
    icon: "📝",
    tools: [
      { name: "Encode / Decode", href: "/tools/encode", icon: "📝" },
      { name: "JWT Decoder", href: "/tools/jwt", icon: "🎫" },
      { name: "QR Code Generator", href: "/tools/qrcode", icon: "📱" },
    ],
  },
  {
    name: "Données",
    icon: "📊",
    tools: [
      { name: "JSON Formatter", href: "/tools/json", icon: "📋" },
      { name: "UUID Generator", href: "/tools/uuid", icon: "🎲" },
      { name: "Timestamp Converter", href: "/tools/timestamp", icon: "🕐" },
    ],
  },
  {
    name: "Texte",
    icon: "✏️",
    tools: [
      { name: "Regex Tester", href: "/tools/regex", icon: "🔍" },
      { name: "Text Diff", href: "/tools/diff", icon: "📊" },
      { name: "Lorem Ipsum", href: "/tools/lorem", icon: "📄" },
    ],
  },
  {
    name: "Web & Système",
    icon: "🌐",
    tools: [
      { name: "URL Parser", href: "/tools/url", icon: "🌐" },
      { name: "Color Converter", href: "/tools/color", icon: "🎨" },
      { name: "Cron Generator", href: "/tools/cron", icon: "⏰" },
    ],
  },
];

// Outils principaux affichés dans la navbar
const mainTools = [
  { name: "Password", href: "/tools/password", icon: "🔐" },
  { name: "Hash", href: "/tools/hash", icon: "🔒" },
  { name: "Encode", href: "/tools/encode", icon: "📝" },
  { name: "Encrypt", href: "/tools/encrypt", icon: "🛡️" },
  { name: "UUID", href: "/tools/uuid", icon: "🎲" },
  { name: "JWT", href: "/tools/jwt", icon: "🎫" },
  { name: "QR Code", href: "/tools/qrcode", icon: "📱" },
  { name: "JSON", href: "/tools/json", icon: "📋" },
];

const allTools = toolCategories.flatMap((cat) => cat.tools);

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group shrink-0" onClick={() => setIsMenuOpen(false)}>
              <span className="text-xl">⚡</span>
              <span className="text-foreground font-bold group-hover:text-glow transition-all hidden sm:inline">
                CRYPTO<span className="text-accent">TOOLBOX</span>
              </span>
            </Link>

            {/* Desktop: Main Tools Links */}
            <div className="hidden md:flex items-center gap-1 flex-1 justify-center overflow-x-auto mx-4">
              {mainTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`px-2 lg:px-3 py-1.5 text-xs lg:text-sm rounded-lg transition-all whitespace-nowrap flex items-center gap-1 ${
                    pathname === tool.href
                      ? "text-foreground bg-foreground/10"
                      : "text-foreground/50 hover:text-foreground hover:bg-foreground/5"
                  }`}
                >
                  <span>{tool.icon}</span>
                  <span className="hidden lg:inline">{tool.name}</span>
                </Link>
              ))}
            </div>

            {/* Menu Button - Always visible */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-lg transition-all shrink-0 flex items-center gap-2 ${
                isMenuOpen 
                  ? "bg-foreground text-background" 
                  : "text-foreground hover:bg-foreground/10"
              }`}
              aria-label="Menu"
            >
              <span className="hidden sm:inline text-sm">
                {isMenuOpen ? "Fermer" : "Outils"}
              </span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Full Screen Menu */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${
          isMenuOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${
            isMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMenuOpen(false)}
        />

        {/* Menu Panel */}
        <div
          className={`absolute top-14 left-0 right-0 bottom-0 bg-background border-t border-border overflow-y-auto transition-all duration-300 ${
            isMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          }`}
        >
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Search hint */}
            <p className="text-foreground/30 text-sm mb-6 text-center">
              {allTools.length} outils disponibles
            </p>

            {/* Categories */}
            <div className="space-y-8">
              {toolCategories.map((category) => (
                <div key={category.name}>
                  {/* Category Header */}
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <span className="text-lg">{category.icon}</span>
                    <h3 className="text-foreground/40 text-sm font-medium uppercase tracking-wider">
                      {category.name}
                    </h3>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Tools Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {category.tools.map((tool) => (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          pathname === tool.href
                            ? "bg-foreground/10 text-foreground border border-foreground/20"
                            : "hover:bg-foreground/5 text-foreground/70 hover:text-foreground border border-transparent"
                        }`}
                      >
                        <span className="text-xl">{tool.icon}</span>
                        <span className="font-medium">{tool.name}</span>
                        {pathname === tool.href && (
                          <span className="ml-auto text-accent">●</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-border text-center">
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className="inline-flex items-center gap-2 text-foreground/40 hover:text-foreground transition-colors"
              >
                <span>⚡</span>
                <span>Retour à l&apos;accueil</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
