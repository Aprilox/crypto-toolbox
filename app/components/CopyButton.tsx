"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export default function CopyButton({ text, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`btn ${copied ? "btn-cyan" : ""} ${className}`}
      title="Copier"
    >
      {copied ? (
        <>
          <span className="mr-2">✓</span>
          Copié!
        </>
      ) : (
        <>
          <span className="mr-2">📋</span>
          Copier
        </>
      )}
    </button>
  );
}

