"use client";

import { useState, useCallback } from "react";
import CopyButton from "@/app/components/CopyButton";

type OutputType = "paragraphs" | "sentences" | "words";

const loremWords = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum", "perspiciatis", "unde",
  "omnis", "iste", "natus", "error", "voluptatem", "accusantium", "doloremque",
  "laudantium", "totam", "rem", "aperiam", "eaque", "ipsa", "quae", "ab", "illo",
  "inventore", "veritatis", "quasi", "architecto", "beatae", "vitae", "dicta",
  "explicabo", "nemo", "ipsam", "quia", "voluptas", "aspernatur", "aut", "odit",
  "fugit", "consequuntur", "magni", "dolores", "eos", "ratione", "sequi",
  "nesciunt", "neque", "porro", "quisquam", "dolorem", "adipisci", "numquam",
  "eius", "modi", "tempora", "incidunt", "magnam", "aliquam", "quaerat",
];

export default function LoremTool() {
  const [count, setCount] = useState(3);
  const [outputType, setOutputType] = useState<OutputType>("paragraphs");
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [output, setOutput] = useState("");

  const getRandomWord = useCallback(() => {
    return loremWords[Math.floor(Math.random() * loremWords.length)];
  }, []);

  const generateSentence = useCallback((minWords = 8, maxWords = 15) => {
    const wordCount = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
    const words: string[] = [];
    
    for (let i = 0; i < wordCount; i++) {
      words.push(getRandomWord());
    }
    
    // Capitalize first word
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    
    // Add random commas
    if (wordCount > 6) {
      const commaPos = Math.floor(Math.random() * (wordCount - 4)) + 2;
      words[commaPos] = words[commaPos] + ",";
    }
    
    return words.join(" ") + ".";
  }, [getRandomWord]);

  const generateParagraph = useCallback((minSentences = 4, maxSentences = 8) => {
    const sentenceCount = Math.floor(Math.random() * (maxSentences - minSentences + 1)) + minSentences;
    const sentences: string[] = [];
    
    for (let i = 0; i < sentenceCount; i++) {
      sentences.push(generateSentence());
    }
    
    return sentences.join(" ");
  }, [generateSentence]);

  const generate = useCallback(() => {
    let result = "";

    switch (outputType) {
      case "words": {
        const words: string[] = [];
        for (let i = 0; i < count; i++) {
          words.push(getRandomWord());
        }
        if (startWithLorem && words.length >= 2) {
          words[0] = "lorem";
          words[1] = "ipsum";
        }
        result = words.join(" ");
        break;
      }
      case "sentences": {
        const sentences: string[] = [];
        for (let i = 0; i < count; i++) {
          sentences.push(generateSentence());
        }
        if (startWithLorem && sentences.length > 0) {
          sentences[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
        }
        result = sentences.join(" ");
        break;
      }
      case "paragraphs": {
        const paragraphs: string[] = [];
        for (let i = 0; i < count; i++) {
          paragraphs.push(generateParagraph());
        }
        if (startWithLorem && paragraphs.length > 0) {
          paragraphs[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " + 
            paragraphs[0].split(". ").slice(1).join(". ");
        }
        result = paragraphs.join("\n\n");
        break;
      }
    }

    setOutput(result);
  }, [count, outputType, startWithLorem, getRandomWord, generateSentence, generateParagraph]);

  const stats = {
    characters: output.length,
    words: output ? output.split(/\s+/).length : 0,
    sentences: output ? (output.match(/[.!?]+/g) || []).length : 0,
    paragraphs: output ? output.split(/\n\n+/).filter(p => p.trim()).length : 0,
  };

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">📝 Lorem</span>
            <span className="text-accent"> Ipsum</span>
          </h1>
          <p className="text-foreground/60">
            Générez du texte placeholder pour vos maquettes
          </p>
        </div>

        {/* Options */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-accent mb-4">Options</h2>
          
          {/* Output Type */}
          <div className="mb-4">
            <label className="text-foreground/80 block mb-2">Type de sortie</label>
            <div className="flex rounded overflow-hidden border border-border">
              {[
                { type: "paragraphs" as OutputType, label: "Paragraphes" },
                { type: "sentences" as OutputType, label: "Phrases" },
                { type: "words" as OutputType, label: "Mots" },
              ].map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setOutputType(opt.type)}
                  className={`flex-1 py-2 px-4 transition-all text-sm ${
                    outputType === opt.type
                      ? "bg-foreground text-background"
                      : "hover:bg-muted text-foreground/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <label className="text-foreground/80">
                Nombre de {outputType === "paragraphs" ? "paragraphes" : outputType === "sentences" ? "phrases" : "mots"}
              </label>
              <span className="text-foreground font-bold">{count}</span>
            </div>
            <input
              type="range"
              min="1"
              max={outputType === "words" ? 500 : outputType === "sentences" ? 50 : 20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Start with Lorem */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={startWithLorem}
              onChange={(e) => setStartWithLorem(e.target.checked)}
            />
            <span className="text-foreground/80">Commencer par &quot;Lorem ipsum...&quot;</span>
          </label>
        </div>

        {/* Generate Button */}
        <button onClick={generate} className="btn w-full mb-6">
          ⚡ Générer
        </button>

        {/* Output */}
        {output && (
          <>
            {/* Stats */}
            <div className="card mb-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-2 bg-background rounded">
                  <div className="text-xl font-bold text-foreground">{stats.paragraphs}</div>
                  <div className="text-xs text-foreground/40">Paragraphes</div>
                </div>
                <div className="p-2 bg-background rounded">
                  <div className="text-xl font-bold text-foreground">{stats.sentences}</div>
                  <div className="text-xs text-foreground/40">Phrases</div>
                </div>
                <div className="p-2 bg-background rounded">
                  <div className="text-xl font-bold text-foreground">{stats.words}</div>
                  <div className="text-xs text-foreground/40">Mots</div>
                </div>
                <div className="p-2 bg-background rounded">
                  <div className="text-xl font-bold text-foreground">{stats.characters}</div>
                  <div className="text-xs text-foreground/40">Caractères</div>
                </div>
              </div>
            </div>

            {/* Text Output */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-accent">Résultat</h2>
                <CopyButton text={output} />
              </div>
              <div className="terminal max-h-96 overflow-auto">
                <div className="terminal-header">
                  <div className="terminal-dot red"></div>
                  <div className="terminal-dot yellow"></div>
                  <div className="terminal-dot green"></div>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {output}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!output && (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4 opacity-30">📝</div>
            <p className="text-foreground/30">
              Cliquez sur Générer pour créer du texte Lorem Ipsum
            </p>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-4 border border-border rounded bg-card/50">
          <h3 className="text-accent font-bold mb-2">ℹ️ À propos du Lorem Ipsum</h3>
          <ul className="text-foreground/60 text-sm space-y-1">
            <li>• Texte placeholder standard utilisé depuis le 16ème siècle</li>
            <li>• Dérivé du &quot;De Finibus Bonorum et Malorum&quot; de Cicéron (45 av. J.-C.)</li>
            <li>• Permet de simuler du contenu sans distraire par le sens</li>
            <li>• Idéal pour les maquettes, prototypes et tests de design</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

