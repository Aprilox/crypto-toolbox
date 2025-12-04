import Link from "next/link";

interface ToolCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  index: number;
}

export default function ToolCard({ title, description, href, icon, index }: ToolCardProps) {
  return (
    <Link
      href={href}
      className="card group relative overflow-hidden animate-fadeIn"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Background glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Icon */}
      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      
      {/* Title */}
      <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-glow transition-all">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-foreground/60 text-sm leading-relaxed">
        {description}
      </p>
      
      {/* Arrow indicator */}
      <div className="absolute bottom-4 right-4 text-foreground/30 group-hover:text-foreground group-hover:translate-x-1 transition-all">
        →
      </div>
    </Link>
  );
}

