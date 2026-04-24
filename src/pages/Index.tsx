import { useEffect, useMemo, useState } from "react";
import { aqiCategory, loadPollutionData, loadPollutionHistoryData, PollutionRow } from "@/lib/pollution";
import { AqiCard } from "@/components/AqiCard";
import { PollutionChart } from "@/components/PollutionChart";
import { PhotoDetector } from "@/components/PhotoDetector";
import { AiAssistant } from "@/components/AiAssistant";
import { InstallButton } from "@/components/InstallButton";
import { QrShare } from "@/components/QrShare";
import { UrbanSignals } from "@/components/UrbanSignals";
import { Activity, AlertTriangle, MapPinned, TrendingUp, Wind } from "lucide-react";
import {
  buildUrbanPressureByCity,
  DEFAULT_ENV_WEIGHTS,
  EnvironmentWeights,
  rankCitiesByEnvironment,
} from "@/lib/environment-score";
import heroImg from "@/assets/hero-tunisia.jpg";

interface UrbanSignal {
  id: string;
  ville: string;
  type: "poubelle" | "route" | "depot";
  severite: number;
  note: string;
  createdAt: string;
}

const URBAN_STORAGE_KEY = "nafas-scan-urban-signals";

const Index = () => {
  const [data, setData] = useState<PollutionRow[]>([]);
  const [historyData, setHistoryData] = useState<PollutionRow[]>([]);
  const [urbanSignals, setUrbanSignals] = useState<UrbanSignal[]>([]);
  const [weights, setWeights] = useState<EnvironmentWeights>(DEFAULT_ENV_WEIGHTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadPollutionData(), loadPollutionHistoryData()])
      .then(([daily, history]) => {
        setData(daily);
        setHistoryData(history);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const readUrbanSignals = () => {
      try {
        const raw = localStorage.getItem(URBAN_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          setUrbanSignals(parsed as UrbanSignal[]);
        }
      } catch {
        setUrbanSignals([]);
      }
    };

    const onUpdated = () => readUrbanSignals();

    readUrbanSignals();
    window.addEventListener("storage", onUpdated);
    window.addEventListener("urban-signals-updated", onUpdated);

    return () => {
      window.removeEventListener("storage", onUpdated);
      window.removeEventListener("urban-signals-updated", onUpdated);
    };
  }, []);

  const avgAqi = data.length ? Math.round(data.reduce((s, r) => s + r.aqi, 0) / data.length) : 0;
  const avgPm25 = data.length ? Math.round(data.reduce((s, r) => s + r.pm25, 0) / data.length) : 0;

  const urbanUrgent = urbanSignals.filter((s) => s.severite >= 4).length;
  const urbanByType = useMemo(() => {
    const counters = { poubelle: 0, route: 0, depot: 0 };
    for (const signal of urbanSignals) {
      counters[signal.type] += 1;
    }
    return counters;
  }, [urbanSignals]);
  const urbanByCity = useMemo(() => buildUrbanPressureByCity(urbanSignals), [urbanSignals]);
  const rankedCities = useMemo(
    () => rankCitiesByEnvironment(data, urbanByCity, weights),
    [data, urbanByCity, weights],
  );
  const avgGlobal = useMemo(() => {
    if (!rankedCities.length) return 0;
    const avg = rankedCities.reduce((sum, city) => sum + city.globalScore, 0) / rankedCities.length;
    return Math.round(avg);
  }, [rankedCities]);
  const avgAqiLabel = aqiCategory(avgAqi).label;
  const hotspotMixte = rankedCities[0] ?? null;
  const best = rankedCities.length ? rankedCities[rankedCities.length - 1] : null;
  const totalWeight = weights.aqi + weights.pm25 + weights.no2 + weights.o3 + weights.urban;
  const hotspotRiskLevel = hotspotMixte ? riskLevel(hotspotMixte.riskScore) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <header className="relative overflow-hidden">
        <img
          src={heroImg}
          alt="Vue aérienne du littoral tunisien"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          width={1536}
          height={896}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        <div className="container relative z-10 mx-auto px-4 py-16 sm:py-24">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <img src="/logo.svg" alt="Nafas Scan" className="h-6 w-6" />
            <span>Nafas Scan · Qualite de l'air en temps reel</span>
          </div>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-6xl">
            Suivi environnemental intelligent en{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">Tunisie</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Suivez la qualite de l'air, le score environnemental global et les signalements urbains.
            L'app s'adapte aux nouveaux indicateurs, aux routes, aux poubelles et aux depots sauvages.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <InstallButton />
            <QrShare />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-24">
        {/* STATS */}
        <section className="-mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <StatCard
            icon={<Activity className="h-5 w-5" />}
            label="Etat environnemental (national)"
            value={`${globalLevel(avgGlobal)} · ${avgGlobal}/100`}
            sub={`Synthese air + urbain sur ${data.length} villes`}
          />
          <StatCard
            icon={<Wind className="h-5 w-5" />}
            label="Qualite de l'air (aujourd'hui)"
            value={`AQI moyen ${avgAqi} (${avgAqiLabel})`}
            sub={`PM2.5 moyen ${avgPm25} ug/m3 · plus bas = mieux`}
          />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Alertes urbaines (terrain)"
            value={`${urbanSignals.length} total`}
            sub={`${urbanUrgent} urgent(s) · Poubelle ${urbanByType.poubelle}, Route ${urbanByType.route}, Depot ${urbanByType.depot}`}
            accent={urbanUrgent > 0 ? "danger" : undefined}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Ville la plus exposee"
            value={hotspotMixte?.row.ville ?? "—"}
            sub={hotspotMixte ? `Risque ${hotspotMixte.riskScore}/100 (${hotspotRiskLevel}) · Pression urbaine ${hotspotMixte.urbanPressure} pts` : "air + routes + dechets"}
            accent={hotspotMixte && hotspotMixte.riskScore >= 60 ? "danger" : undefined}
          />
          <StatCard
            icon={<MapPinned className="h-5 w-5" />}
            label="Ville la plus saine"
            value={best?.row.ville ?? "—"}
            sub={best ? `Score global ${best.globalScore}/100` : "—"}
            accent="success"
          />
        </section>

        <section className="mt-4 rounded-xl border border-border bg-card/60 p-4 text-sm">
          <div className="font-medium">Comment lire ces chiffres</div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
            <div>Score global: synthese air + urbain calibree par vos ponderations.</div>
            <div>AQI: qualite de l'air. Plus faible = meilleur.</div>
            <div>Signalements actifs: total des alertes locales enregistrees.</div>
            <div>Risque: 0 faible, 100 tres eleve pour la ville.</div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Score environnement global calibre</h2>
              <p className="text-sm text-muted-foreground">
                Ajustez les ponderations pour recalculer le classement des villes en temps reel.
              </p>
            </div>
            <button
              type="button"
              className="h-9 rounded-lg border border-border px-3 text-sm hover:bg-secondary"
              onClick={() => setWeights(DEFAULT_ENV_WEIGHTS)}
            >
              Reinitialiser
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <WeightSlider label="AQI" value={weights.aqi} share={totalWeight ? Math.round((weights.aqi / totalWeight) * 100) : 0} onChange={(value) => setWeights((prev) => ({ ...prev, aqi: value }))} />
            <WeightSlider label="PM2.5" value={weights.pm25} share={totalWeight ? Math.round((weights.pm25 / totalWeight) * 100) : 0} onChange={(value) => setWeights((prev) => ({ ...prev, pm25: value }))} />
            <WeightSlider label="NO2" value={weights.no2} share={totalWeight ? Math.round((weights.no2 / totalWeight) * 100) : 0} onChange={(value) => setWeights((prev) => ({ ...prev, no2: value }))} />
            <WeightSlider label="O3" value={weights.o3} share={totalWeight ? Math.round((weights.o3 / totalWeight) * 100) : 0} onChange={(value) => setWeights((prev) => ({ ...prev, o3: value }))} />
            <WeightSlider label="Urbain" value={weights.urban} share={totalWeight ? Math.round((weights.urban / totalWeight) * 100) : 0} onChange={(value) => setWeights((prev) => ({ ...prev, urban: value }))} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-3">
              <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Villes les plus a risque</div>
              <div className="space-y-2">
                {rankedCities.slice(0, 5).map((city, index) => (
                  <RankRow key={city.row.ville} order={index + 1} city={city.row.ville} leftLabel={`Risque ${city.riskScore}/100`} rightLabel={`Global ${city.globalScore}/100`} tone="danger" />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-3">
              <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Villes les plus resilientes</div>
              <div className="space-y-2">
                {[...rankedCities].reverse().slice(0, 5).map((city, index) => (
                  <RankRow key={city.row.ville} order={index + 1} city={city.row.ville} leftLabel={`Global ${city.globalScore}/100`} rightLabel={`Urbain ${city.urbanPressure}`} tone="success" />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CHART */}
        <section className="mt-10">
          {loading ? (
            <div className="h-72 animate-pulse rounded-2xl bg-secondary" />
          ) : (
            <PollutionChart data={data} historyData={historyData} weights={weights} urbanByCity={urbanByCity} />
          )}
        </section>

        {/* GRID CARDS */}
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold">Villes tunisiennes</h2>
              <p className="text-sm text-muted-foreground">{data.length} stations · classement par score environnement global</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rankedCities.map((city) => <AqiCard key={city.row.ville} row={city.row} />)}
          </div>
        </section>

        <UrbanSignals cities={data} />

        {/* AI TOOLS */}
        <section className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PhotoDetector />
          <AiAssistant data={data} />
        </section>
      </main>

      <footer className="border-t border-border bg-card/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Nafas Scan · Qualite de l'air, routes et dechets urbains · Propulse par l'IA
        </div>
      </footer>
    </div>
  );
};

const StatCard = ({
  icon, label, value, sub, accent,
}: { icon: React.ReactNode; label: string; value: string; sub: string; accent?: "danger" | "success" }) => (
  <div className="min-h-40 rounded-2xl border border-border bg-card p-5 shadow-glacier">
    <div className="mt-4 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className={`mt-2 font-display text-3xl font-bold ${accent === "danger" ? "text-destructive" : accent === "success" ? "text-[hsl(var(--success))]" : ""}`}>
      {value}
    </div>
    <div className="mt-1 text-sm leading-snug text-muted-foreground">{sub}</div>
  </div>
);

function riskLevel(score: number) {
  if (score >= 75) return "eleve";
  if (score >= 45) return "modere";
  return "faible";
}

function globalLevel(score: number) {
  if (score >= 80) return "Tres bon";
  if (score >= 65) return "Bon";
  if (score >= 45) return "Moyen";
  return "Critique";
}

const WeightSlider = ({
  label,
  value,
  share,
  onChange,
}: {
  label: string;
  value: number;
  share: number;
  onChange: (value: number) => void;
}) => (
  <label className="rounded-lg border border-border bg-background p-3">
    <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
      <span>{label}</span>
      <span>{share}%</span>
    </div>
    <input
      type="range"
      min={0}
      max={60}
      step={1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full"
    />
    <div className="text-sm font-medium">Poids {value}</div>
  </label>
);

const RankRow = ({
  order,
  city,
  leftLabel,
  rightLabel,
  tone,
}: {
  order: number;
  city: string;
  leftLabel: string;
  rightLabel: string;
  tone: "danger" | "success";
}) => (
  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
    <div className="flex items-center gap-2">
      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${tone === "danger" ? "bg-destructive/15 text-destructive" : "bg-emerald-100 text-emerald-700"}`}>
        {order}
      </span>
      <span className="font-medium">{city}</span>
    </div>
    <div className="text-right text-xs text-muted-foreground">
      <div>{leftLabel}</div>
      <div>{rightLabel}</div>
    </div>
  </div>
);

export default Index;
