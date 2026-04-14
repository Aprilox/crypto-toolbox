import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Page introuvable | Crypto Toolbox",
  description: "Cette page n'existe pas.",
};

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="max-w-xl w-full">

        {/* Terminal window */}
        <div className="terminal mb-8 animate-fadeIn">
          <div className="terminal-header">
            <div className="terminal-dot red" />
            <div className="terminal-dot yellow" />
            <div className="terminal-dot green" />
          </div>

          <div className="space-y-2 text-sm">
            <p>
              <span className="text-foreground/40">$</span>{" "}
              <span className="text-accent">GET</span>{" "}
              <span className="text-foreground/70">/cette-page-nexiste-pas</span>
            </p>
            <p>
              <span className="text-foreground/40">→</span>{" "}
              <span style={{ color: "var(--error)" }}>HTTP 404</span>{" "}
              <span className="text-foreground/50">Not Found</span>
            </p>
            <p className="text-foreground/30">
              {/* timestamp */}
              <span suppressHydrationWarning>
                {new Date().toISOString().replace("T", " ").slice(0, 19)}
              </span>
            </p>
          </div>
        </div>

        {/* Big 404 */}
        <div className="text-center mb-8 animate-fadeIn" style={{ animationDelay: "0.1s" }}>
          <p
            className="font-bold leading-none select-none"
            style={{
              fontSize: "clamp(6rem, 20vw, 10rem)",
              color: "transparent",
              WebkitTextStroke: "2px var(--foreground)",
              textShadow: "0 0 40px rgba(0,255,65,0.3)",
              letterSpacing: "-0.05em",
            }}
          >
            404
          </p>
          <p className="text-accent text-lg mt-2 text-glow-cyan">Page introuvable</p>
          <p className="text-foreground/40 text-sm mt-2">
            L&apos;URL demandée ne correspond à aucune ressource connue.
          </p>
        </div>

        {/* Suggestions */}
        <div
          className="card mb-8 animate-fadeIn"
          style={{ animationDelay: "0.2s" }}
        >
          <p className="text-foreground/50 text-xs uppercase tracking-widest mb-4">
            Outils disponibles
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { href: "/tools/password", label: "🔑 Mot de passe" },
              { href: "/tools/hash", label: "# Hash" },
              { href: "/tools/encrypt", label: "🔒 Chiffrement" },
              { href: "/tools/encode", label: "📦 Encodage" },
              { href: "/tools/uuid", label: "🆔 UUID" },
              { href: "/tools/jwt", label: "🎫 JWT" },
              { href: "/tools/qrcode", label: "📱 QR Code" },
              { href: "/tools/filedrop", label: "📡 File Drop" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-2 rounded border border-border text-foreground/60 hover:text-accent hover:border-accent transition-colors text-xs"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Back home button */}
        <div className="text-center animate-fadeIn" style={{ animationDelay: "0.3s" }}>
          <Link href="/" className="btn btn-cyan inline-block">
            ← Retour à l&apos;accueil
          </Link>
        </div>

      </div>
    </div>
  );
}
