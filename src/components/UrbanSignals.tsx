import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, PlusCircle, Route, Trash2 } from "lucide-react";
import type { PollutionRow } from "@/lib/pollution";

type SignalType = "poubelle" | "route" | "depot";

interface UrbanSignal {
  id: string;
  ville: string;
  type: SignalType;
  severite: number;
  note: string;
  createdAt: string;
}

const STORAGE_KEY = "nafas-scan-urban-signals";

const signalLabels: Record<SignalType, string> = {
  poubelle: "Poubelles debordantes",
  route: "Pollution des routes",
  depot: "Depots sauvages",
};

export const UrbanSignals = ({ cities }: { cities: PollutionRow[] }) => {
  const [signals, setSignals] = useState<UrbanSignal[]>([]);
  const [ville, setVille] = useState("");
  const [type, setType] = useState<SignalType>("poubelle");
  const [severite, setSeverite] = useState(3);
  const [note, setNote] = useState("");
  const [filterVille, setFilterVille] = useState("all");
  const [filterType, setFilterType] = useState<SignalType | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as UrbanSignal[];
      if (Array.isArray(parsed)) setSignals(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(signals));
    window.dispatchEvent(new Event("urban-signals-updated"));
  }, [signals]);

  useEffect(() => {
    if (cities.length && !ville) setVille(cities[0].ville);
  }, [cities, ville]);

  const cityOptions = useMemo(() => {
    const unique = new Set(cities.map((c) => c.ville));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [cities]);

  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      if (filterVille !== "all" && s.ville !== filterVille) return false;
      if (filterType !== "all" && s.type !== filterType) return false;

      const day = toDayKey(s.createdAt);
      if (startDate && day < startDate) return false;
      if (endDate && day > endDate) return false;

      return true;
    });
  }, [signals, filterVille, filterType, startDate, endDate]);

  const summary = useMemo(() => {
    const countByType: Record<SignalType, number> = {
      poubelle: 0,
      route: 0,
      depot: 0,
    };

    const countByCity: Record<string, number> = {};
    let urgent = 0;
    let totalSeverity = 0;

    for (const s of filteredSignals) {
      countByType[s.type] += 1;
      countByCity[s.ville] = (countByCity[s.ville] ?? 0) + 1;
      if (s.severite >= 4) urgent += 1;
      totalSeverity += s.severite;
    }

    const hotspot = Object.entries(countByCity).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
    const avgSeverity = filteredSignals.length ? totalSeverity / filteredSignals.length : 0;
    const urbanIndex = Math.max(0, Math.round(100 - avgSeverity * 15));

    return { countByType, hotspot, urgent, urbanIndex };
  }, [filteredSignals]);

  const trend = useMemo(() => {
    const byDay: Record<string, { count: number; severityTotal: number }> = {};

    for (const s of filteredSignals) {
      const day = toDayKey(s.createdAt);
      if (!byDay[day]) byDay[day] = { count: 0, severityTotal: 0 };
      byDay[day].count += 1;
      byDay[day].severityTotal += s.severite;
    }

    return Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, value]) => ({
        day,
        count: value.count,
        avgSeverity: Number((value.severityTotal / value.count).toFixed(1)),
      }));
  }, [filteredSignals]);

  const maxTrendCount = useMemo(() => Math.max(1, ...trend.map((t) => t.count)), [trend]);

  const submitSignal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ville) return;

    const next: UrbanSignal = {
      id: crypto.randomUUID(),
      ville,
      type,
      severite,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };

    setSignals((prev) => [next, ...prev].slice(0, 100));
    setNote("");
    setSeverite(3);
  };

  return (
    <section className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold">Signalements urbains</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajoutez des signalements sur les poubelles, la pollution routiere et les depots sauvages.
        </p>

        <form onSubmit={submitSignal} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Ville</span>
              <select
                className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary"
                value={ville}
                onChange={(e) => setVille(e.target.value)}
              >
                {cities.map((c) => (
                  <option key={c.ville} value={c.ville}>{c.ville}</option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Type</span>
              <select
                className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary"
                value={type}
                onChange={(e) => setType(e.target.value as SignalType)}
              >
                <option value="poubelle">Poubelles debordantes</option>
                <option value="route">Pollution des routes</option>
                <option value="depot">Depots sauvages</option>
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
              Severite: {severite}/5
            </span>
            <input
              type="range"
              min={1}
              max={5}
              value={severite}
              onChange={(e) => setSeverite(Number(e.target.value))}
              className="w-full"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Description</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: sacs d'ordures non ramasses pres du marche"
              className="min-h-24 w-full rounded-lg border border-border bg-background p-3 outline-none focus:border-primary"
            />
          </label>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Ajouter le signalement
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold">Tableau environnement urbain</h3>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <SmallMetric label="Indice urbain" value={`${summary.urbanIndex}/100`} />
          <SmallMetric label="Signalements urgents" value={String(summary.urgent)} />
          <SmallMetric label="Poubelles" value={String(summary.countByType.poubelle)} icon={<Trash2 className="h-4 w-4" />} />
          <SmallMetric label="Routes" value={String(summary.countByType.route)} icon={<Route className="h-4 w-4" />} />
        </div>

        <div className="mt-4 rounded-xl bg-secondary/50 p-3 text-sm">
          <span className="text-muted-foreground">Hotspot actuel: </span>
          <span className="font-medium">{summary.hotspot}</span>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-background p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Filtres d'analyse</div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Ville</span>
              <select
                className="h-9 w-full rounded-lg border border-border bg-background px-2.5 outline-none focus:border-primary"
                value={filterVille}
                onChange={(e) => setFilterVille(e.target.value)}
              >
                <option value="all">Toutes les villes</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Type</span>
              <select
                className="h-9 w-full rounded-lg border border-border bg-background px-2.5 outline-none focus:border-primary"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as SignalType | "all")}
              >
                <option value="all">Tous les types</option>
                <option value="poubelle">Poubelles debordantes</option>
                <option value="route">Pollution des routes</option>
                <option value="depot">Depots sauvages</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Date debut</span>
              <input
                type="date"
                className="h-9 w-full rounded-lg border border-border bg-background px-2.5 outline-none focus:border-primary"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Date fin</span>
              <input
                type="date"
                className="h-9 w-full rounded-lg border border-border bg-background px-2.5 outline-none focus:border-primary"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Evolution des signalements ({filteredSignals.length})
          </div>
          {trend.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              Aucun point d'evolution sur cette periode.
            </div>
          ) : (
            trend.slice(-14).map((item) => (
              <div key={item.day} className="rounded-lg border border-border bg-background p-2.5">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.day}</span>
                  <span>{item.count} signalement(s) · severite moyenne {item.avgSeverity}/5</span>
                </div>
                <div className="h-2 w-full rounded bg-secondary">
                  <div
                    className="h-2 rounded bg-primary"
                    style={{ width: `${Math.max(8, (item.count / maxTrendCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Derniers signalements filtres</div>
          {filteredSignals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              Aucun signalement avec les filtres actuels.
            </div>
          ) : (
            filteredSignals.slice(0, 5).map((s) => (
              <div key={s.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.ville}</span>
                  <span className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString("fr-TN")}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {signalLabels[s.type]} · severite {s.severite}/5
                </div>
                {s.note && <p className="mt-1 text-foreground/80">{s.note}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

const SmallMetric = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <div className="rounded-lg border border-border bg-background p-3">
    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className="mt-1 font-display text-2xl font-semibold">{value}</div>
  </div>
);

function toDayKey(isoDate: string) {
  return new Date(isoDate).toISOString().slice(0, 10);
}
