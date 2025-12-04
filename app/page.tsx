import ToolCard from "./components/ToolCard";

const tools = [
  {
    title: "Password Generator",
    description: "Générez des mots de passe sécurisés avec options de longueur, caractères et exclusions.",
    href: "/tools/password",
    icon: "🔐",
  },
  {
    title: "Hash Generator",
    description: "Calculez les hachages MD5, SHA-1, SHA-256 et SHA-512 de vos textes.",
    href: "/tools/hash",
    icon: "🔒",
  },
  {
    title: "Encode / Decode",
    description: "Encodez et décodez en Base64, URL encoding et Hexadécimal.",
    href: "/tools/encode",
    icon: "📝",
  },
  {
    title: "Encrypt / Decrypt",
    description: "Chiffrez vos données avec AES-256, DES, TripleDES, Rabbit ou RC4.",
    href: "/tools/encrypt",
    icon: "🛡️",
  },
  {
    title: "UUID Generator",
    description: "Générez des identifiants uniques UUID v1 et v4 en lot.",
    href: "/tools/uuid",
    icon: "🎲",
  },
  {
    title: "File Checksum",
    description: "Vérifiez l'intégrité de vos fichiers avec MD5 et SHA-256.",
    href: "/tools/checksum",
    icon: "📁",
  },
  {
    title: "JWT Decoder",
    description: "Décodez et analysez vos JSON Web Tokens.",
    href: "/tools/jwt",
    icon: "🎫",
  },
  {
    title: "QR Code Generator",
    description: "Créez des QR codes personnalisés avec export PNG/SVG.",
    href: "/tools/qrcode",
    icon: "📱",
  },
  {
    title: "Timestamp Converter",
    description: "Convertissez entre Unix timestamp et date lisible.",
    href: "/tools/timestamp",
    icon: "🕐",
  },
  {
    title: "JSON Formatter",
    description: "Formatez, minifiez et validez votre JSON.",
    href: "/tools/json",
    icon: "📋",
  },
  {
    title: "Regex Tester",
    description: "Testez vos expressions régulières en temps réel.",
    href: "/tools/regex",
    icon: "🔍",
  },
  {
    title: "Color Converter",
    description: "Convertissez entre HEX, RGB, HSL, HSV et CMYK.",
    href: "/tools/color",
    icon: "🎨",
  },
  {
    title: "Text Diff",
    description: "Comparez deux textes et visualisez les différences.",
    href: "/tools/diff",
    icon: "📊",
  },
  {
    title: "URL Parser",
    description: "Décomposez et analysez les URLs en détail.",
    href: "/tools/url",
    icon: "🌐",
  },
  {
    title: "Lorem Ipsum",
    description: "Générez du texte placeholder pour vos maquettes.",
    href: "/tools/lorem",
    icon: "📄",
  },
  {
    title: "Cron Generator",
    description: "Générez et comprenez les expressions cron pour vos tâches planifiées.",
    href: "/tools/cron",
    icon: "⏰",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <div className="terminal-header justify-center">
              <div className="terminal-dot red"></div>
              <div className="terminal-dot yellow"></div>
              <div className="terminal-dot green"></div>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-glow">CRYPTO</span>
            <span className="text-accent text-glow-cyan">TOOLBOX</span>
          </h1>
          
          <p className="text-foreground/60 text-lg sm:text-xl max-w-2xl mx-auto mb-4">
            <span className="text-accent">&gt;</span> Boîte à outils complète pour développeurs
            <span className="cursor-blink"></span>
          </p>
          
          <p className="text-foreground/40 text-sm max-w-xl mx-auto">
            {tools.length} outils essentiels : cryptographie, encodage, formatage et utilitaires.
            100% local, aucune donnée envoyée.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {tools.map((tool, index) => (
            <ToolCard
              key={tool.href}
              title={tool.title}
              description={tool.description}
              href={tool.href}
              icon={tool.icon}
              index={index}
            />
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-foreground/30 text-sm">
          <p>
            <span className="text-foreground/50">[</span>
            Tous les calculs sont effectués localement dans votre navigateur
            <span className="text-foreground/50">]</span>
          </p>
          <p className="mt-2">
            Aucune donnée n&apos;est envoyée à un serveur externe.
          </p>
        </footer>
      </div>
    </div>
  );
}
