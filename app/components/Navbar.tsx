"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const tools = [
  { name: "Password", href: "/tools/password", icon: "🔐" },
  { name: "Hash", href: "/tools/hash", icon: "🔒" },
  { name: "Encode", href: "/tools/encode", icon: "📝" },
  { name: "Encrypt", href: "/tools/encrypt", icon: "🛡️" },
  { name: "UUID", href: "/tools/uuid", icon: "🎲" },
  { name: "Checksum", href: "/tools/checksum", icon: "📁" },
  { name: "JWT", href: "/tools/jwt", icon: "🎫" },
  { name: "QR Code", href: "/tools/qrcode", icon: "📱" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">⚡</span>
            <span className="text-foreground font-bold text-lg group-hover:text-glow transition-all">
              CRYPTO<span className="text-accent">TOOLBOX</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={`px-3 py-2 text-sm transition-all hover:text-foreground hover:bg-muted rounded ${
                  pathname === tool.href
                    ? "text-foreground bg-muted"
                    : "text-foreground/60"
                }`}
              >
                <span className="mr-1">{tool.icon}</span>
                {tool.name}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground hover:bg-muted rounded"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="grid grid-cols-2 gap-2">
              {tools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-3 text-sm transition-all hover:text-foreground hover:bg-muted rounded ${
                    pathname === tool.href
                      ? "text-foreground bg-muted"
                      : "text-foreground/60"
                  }`}
                >
                  <span className="mr-2">{tool.icon}</span>
                  {tool.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

