"use client";

import { useState, useMemo } from "react";
import CopyButton from "@/app/components/CopyButton";

interface CronPart {
  value: string;
  options: { value: string; label: string }[];
  label: string;
  range: string;
}

const presets = [
  { label: "Chaque minute", cron: "* * * * *" },
  { label: "Chaque heure", cron: "0 * * * *" },
  { label: "Chaque jour à minuit", cron: "0 0 * * *" },
  { label: "Chaque jour à 8h", cron: "0 8 * * *" },
  { label: "Chaque lundi à 9h", cron: "0 9 * * 1" },
  { label: "1er du mois à minuit", cron: "0 0 1 * *" },
  { label: "Chaque dimanche à 23h", cron: "0 23 * * 0" },
  { label: "Toutes les 5 minutes", cron: "*/5 * * * *" },
  { label: "Toutes les 15 minutes", cron: "*/15 * * * *" },
  { label: "Toutes les 30 minutes", cron: "*/30 * * * *" },
  { label: "Toutes les 2 heures", cron: "0 */2 * * *" },
  { label: "Du lundi au vendredi à 9h", cron: "0 9 * * 1-5" },
];

const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export default function CronTool() {
  const [minute, setMinute] = useState("*");
  const [hour, setHour] = useState("*");
  const [dayOfMonth, setDayOfMonth] = useState("*");
  const [month, setMonth] = useState("*");
  const [dayOfWeek, setDayOfWeek] = useState("*");
  const [inputCron, setInputCron] = useState("");

  const cronExpression = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;

  const parseCron = (cron: string) => {
    const parts = cron.trim().split(/\s+/);
    if (parts.length === 5) {
      setMinute(parts[0]);
      setHour(parts[1]);
      setDayOfMonth(parts[2]);
      setMonth(parts[3]);
      setDayOfWeek(parts[4]);
      setInputCron(cron);
    }
  };

  const description = useMemo(() => {
    const parts: string[] = [];

    // Minute
    if (minute === "*") {
      parts.push("chaque minute");
    } else if (minute.startsWith("*/")) {
      parts.push(`toutes les ${minute.slice(2)} minutes`);
    } else if (minute.includes(",")) {
      parts.push(`aux minutes ${minute}`);
    } else if (minute.includes("-")) {
      parts.push(`des minutes ${minute.replace("-", " à ")}`);
    } else {
      parts.push(`à la minute ${minute}`);
    }

    // Hour
    if (hour === "*") {
      parts.push("de chaque heure");
    } else if (hour.startsWith("*/")) {
      parts.push(`toutes les ${hour.slice(2)} heures`);
    } else if (hour.includes(",")) {
      parts.push(`aux heures ${hour}h`);
    } else if (hour.includes("-")) {
      parts.push(`des heures ${hour.replace("-", "h à ")}h`);
    } else {
      parts.push(`à ${hour}h`);
    }

    // Day of month
    if (dayOfMonth !== "*") {
      if (dayOfMonth.startsWith("*/")) {
        parts.push(`tous les ${dayOfMonth.slice(2)} jours`);
      } else if (dayOfMonth.includes(",")) {
        parts.push(`les jours ${dayOfMonth}`);
      } else if (dayOfMonth.includes("-")) {
        parts.push(`du ${dayOfMonth.replace("-", " au ")} du mois`);
      } else {
        parts.push(`le ${dayOfMonth} du mois`);
      }
    }

    // Month
    if (month !== "*") {
      if (month.includes(",")) {
        const months = month.split(",").map(m => monthNames[parseInt(m) - 1] || m).join(", ");
        parts.push(`en ${months}`);
      } else if (month.includes("-")) {
        const [start, end] = month.split("-");
        parts.push(`de ${monthNames[parseInt(start) - 1]} à ${monthNames[parseInt(end) - 1]}`);
      } else {
        parts.push(`en ${monthNames[parseInt(month) - 1] || month}`);
      }
    }

    // Day of week
    if (dayOfWeek !== "*") {
      if (dayOfWeek.includes(",")) {
        const days = dayOfWeek.split(",").map(d => dayNames[parseInt(d)] || d).join(", ");
        parts.push(`les ${days}`);
      } else if (dayOfWeek.includes("-")) {
        const [start, end] = dayOfWeek.split("-");
        parts.push(`du ${dayNames[parseInt(start)]} au ${dayNames[parseInt(end)]}`);
      } else {
        parts.push(`le ${dayNames[parseInt(dayOfWeek)] || dayOfWeek}`);
      }
    }

    return parts.join(", ");
  }, [minute, hour, dayOfMonth, month, dayOfWeek]);

  const getNextExecutions = useMemo(() => {
    // Simplified next executions (not 100% accurate for complex crons)
    const executions: Date[] = [];
    const now = new Date();
    let current = new Date(now);

    for (let i = 0; i < 5 && executions.length < 5; i++) {
      current = new Date(current.getTime() + 60000); // Add 1 minute
      
      // Simple check for basic crons
      const m = current.getMinutes();
      const h = current.getHours();
      const dom = current.getDate();
      const mon = current.getMonth() + 1;
      const dow = current.getDay();

      const matchMinute = minute === "*" || minute === m.toString() || 
        (minute.startsWith("*/") && m % parseInt(minute.slice(2)) === 0);
      const matchHour = hour === "*" || hour === h.toString() ||
        (hour.startsWith("*/") && h % parseInt(hour.slice(2)) === 0);
      const matchDom = dayOfMonth === "*" || dayOfMonth === dom.toString();
      const matchMonth = month === "*" || month === mon.toString();
      const matchDow = dayOfWeek === "*" || dayOfWeek === dow.toString() ||
        dayOfWeek.split(",").includes(dow.toString()) ||
        (dayOfWeek.includes("-") && dow >= parseInt(dayOfWeek.split("-")[0]) && dow <= parseInt(dayOfWeek.split("-")[1]));

      if (matchMinute && matchHour && matchDom && matchMonth && matchDow) {
        executions.push(new Date(current));
      }

      // Speed up search
      if (executions.length < 5) {
        if (minute !== "*" && !minute.startsWith("*/")) {
          current.setMinutes(parseInt(minute));
        }
        if (hour !== "*" && !hour.startsWith("*/") && current <= now) {
          current.setHours(parseInt(hour) + 24);
        }
      }
    }

    return executions;
  }, [minute, hour, dayOfMonth, month, dayOfWeek]);

  const cronParts: CronPart[] = [
    {
      value: minute,
      label: "Minute",
      range: "0-59",
      options: [
        { value: "*", label: "Chaque minute (*)" },
        { value: "0", label: "0" },
        { value: "15", label: "15" },
        { value: "30", label: "30" },
        { value: "45", label: "45" },
        { value: "*/5", label: "Toutes les 5 min (*/5)" },
        { value: "*/10", label: "Toutes les 10 min (*/10)" },
        { value: "*/15", label: "Toutes les 15 min (*/15)" },
        { value: "*/30", label: "Toutes les 30 min (*/30)" },
      ],
    },
    {
      value: hour,
      label: "Heure",
      range: "0-23",
      options: [
        { value: "*", label: "Chaque heure (*)" },
        { value: "0", label: "0h (minuit)" },
        { value: "6", label: "6h" },
        { value: "8", label: "8h" },
        { value: "9", label: "9h" },
        { value: "12", label: "12h (midi)" },
        { value: "18", label: "18h" },
        { value: "23", label: "23h" },
        { value: "*/2", label: "Toutes les 2h (*/2)" },
        { value: "*/6", label: "Toutes les 6h (*/6)" },
      ],
    },
    {
      value: dayOfMonth,
      label: "Jour du mois",
      range: "1-31",
      options: [
        { value: "*", label: "Chaque jour (*)" },
        { value: "1", label: "1er" },
        { value: "15", label: "15" },
        { value: "L", label: "Dernier jour (L)" },
        { value: "1,15", label: "1er et 15" },
      ],
    },
    {
      value: month,
      label: "Mois",
      range: "1-12",
      options: [
        { value: "*", label: "Chaque mois (*)" },
        { value: "1", label: "Janvier" },
        { value: "6", label: "Juin" },
        { value: "12", label: "Décembre" },
        { value: "1,4,7,10", label: "Trimestriel" },
      ],
    },
    {
      value: dayOfWeek,
      label: "Jour de la semaine",
      range: "0-6 (Dim=0)",
      options: [
        { value: "*", label: "Chaque jour (*)" },
        { value: "0", label: "Dimanche" },
        { value: "1", label: "Lundi" },
        { value: "5", label: "Vendredi" },
        { value: "6", label: "Samedi" },
        { value: "1-5", label: "Lun-Ven (1-5)" },
        { value: "0,6", label: "Weekend (0,6)" },
      ],
    },
  ];

  const setters = [setMinute, setHour, setDayOfMonth, setMonth, setDayOfWeek];

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">⏰ Cron</span>
            <span className="text-accent"> Generator</span>
          </h1>
          <p className="text-foreground/60">
            Générez et comprenez les expressions cron pour vos tâches planifiées
          </p>
        </div>

        {/* Result */}
        <div className="card mb-6 border-accent/50">
          <h2 className="text-lg font-bold text-accent mb-3">Expression Cron</h2>
          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dot red"></div>
              <div className="terminal-dot yellow"></div>
              <div className="terminal-dot green"></div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono tracking-wider">
              {cronExpression}
            </div>
          </div>
          <div className="mt-3 p-3 bg-background rounded border border-border">
            <p className="text-foreground/80 text-sm">
              📅 <strong>Signification :</strong> {description}
            </p>
          </div>
          <div className="mt-3">
            <CopyButton text={cronExpression} className="w-full" />
          </div>
        </div>

        {/* Parse existing cron */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-accent mb-3">📥 Importer une expression</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputCron}
              onChange={(e) => setInputCron(e.target.value)}
              placeholder="Ex: */15 * * * *"
              className="flex-1 font-mono"
            />
            <button onClick={() => parseCron(inputCron)} className="btn">
              Importer
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-accent mb-3">⚡ Presets courants</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.cron}
                onClick={() => parseCron(preset.cron)}
                className={`p-2 rounded border text-left text-sm transition-all ${
                  cronExpression === preset.cron
                    ? "border-foreground bg-foreground/10 text-foreground"
                    : "border-border hover:border-foreground/50 text-foreground/60"
                }`}
              >
                <div className="font-medium">{preset.label}</div>
                <code className="text-xs text-foreground/40">{preset.cron}</code>
              </button>
            ))}
          </div>
        </div>

        {/* Builder */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-accent mb-4">🔧 Générateur</h2>
          <div className="space-y-4">
            {cronParts.map((part, index) => (
              <div key={part.label} className="grid grid-cols-3 gap-3 items-center">
                <div>
                  <div className="text-foreground font-medium">{part.label}</div>
                  <div className="text-xs text-foreground/40">{part.range}</div>
                </div>
                <select
                  value={part.value}
                  onChange={(e) => setters[index](e.target.value)}
                  className="col-span-1 bg-background border border-border rounded px-3 py-2"
                >
                  {part.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={part.value}
                  onChange={(e) => setters[index](e.target.value)}
                  className="font-mono text-center"
                  placeholder={part.range}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Visual explanation */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-accent mb-3">📊 Structure</h2>
          <div className="overflow-x-auto">
            <div className="flex justify-between min-w-[400px] text-center font-mono">
              {[minute, hour, dayOfMonth, month, dayOfWeek].map((val, i) => (
                <div key={i} className="flex-1 p-2">
                  <div className="text-2xl font-bold text-foreground">{val}</div>
                  <div className="text-xs text-foreground/40 mt-1">
                    {["Minute", "Heure", "Jour", "Mois", "Sem."][i]}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between min-w-[400px] text-center text-xs text-foreground/30 border-t border-border pt-2 mt-2">
              <div className="flex-1">0-59</div>
              <div className="flex-1">0-23</div>
              <div className="flex-1">1-31</div>
              <div className="flex-1">1-12</div>
              <div className="flex-1">0-6</div>
            </div>
          </div>
        </div>

        {/* Cheat Sheet */}
        <div className="card">
          <h2 className="text-lg font-bold text-accent mb-3">📖 Aide-mémoire</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">*</code>
              <span className="text-foreground/40 ml-2">Toutes les valeurs</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">*/n</code>
              <span className="text-foreground/40 ml-2">Toutes les n unités</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">1,3,5</code>
              <span className="text-foreground/40 ml-2">Liste de valeurs</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">1-5</code>
              <span className="text-foreground/40 ml-2">Plage de valeurs</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">L</code>
              <span className="text-foreground/40 ml-2">Dernier jour</span>
            </div>
            <div className="p-2 bg-background rounded">
              <code className="text-foreground">?</code>
              <span className="text-foreground/40 ml-2">Non spécifié</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-background rounded border border-border">
            <p className="text-foreground/60 text-sm">
              <strong>Format :</strong> <code className="text-accent">minute heure jour_du_mois mois jour_de_la_semaine</code>
            </p>
            <p className="text-foreground/40 text-xs mt-2">
              Note : Certains systèmes (comme Quartz) ajoutent un 6ème champ pour les secondes au début.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

