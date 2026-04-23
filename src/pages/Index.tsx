import { useEffect, useState } from "react";
import { loadPollutionData, PollutionRow } from "@/lib/pollution";
import { AqiCard } from "@/components/AqiCard";
import { PollutionChart } from "@/components/PollutionChart";
import { PhotoDetector } from "@/components/PhotoDetector";
import { AiAssistant } from "@/components/AiAssistant";
import { InstallButton } from "@/components/InstallButton";
import { QrShare } from "@/components/QrShare";
import { Wind, Activity, MapPinned, TrendingUp } from "lucide-react";
import heroImg from "@/assets/hero-tunisia.jpg";

const Index = () => {
  const [data, setData] = useState<PollutionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPollutionData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const avgAqi = data.length ? Math.round(data.reduce((s, r) => s + r.aqi, 0) / data.length) : 0;
  const worst = data.length ? data.reduce((a, b) => (a.aqi > b.aqi ? a : b)) : null;
  const best = data.length ? data.reduce((a, b) => (a.aqi < b.aqi ? a : b)) : null;

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
            <Wind className="h-4 w-4" />
            <span>AirTunisie · Qualité de l'air en temps réel</span>
          </div>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-6xl">
            La pollution atmosphérique en{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">Tunisie</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Suivez en temps réel l'indice AQI des 24 principales villes tunisiennes. Détectez la pollution
            sur photos grâce à l'IA et discutez avec un assistant intelligent.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <InstallButton />
            <QrShare />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-24">
        {/* STATS */}
        <section className="-mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={<Activity className="h-5 w-5" />} label="AQI moyen national" value={String(avgAqi)} sub="indice de qualité" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Ville la plus polluée" value={worst?.ville ?? "—"} sub={`AQI ${worst?.aqi ?? "—"}`} accent="danger" />
          <StatCard icon={<MapPinned className="h-5 w-5" />} label="Ville la plus saine" value={best?.ville ?? "—"} sub={`AQI ${best?.aqi ?? "—"}`} accent="success" />
        </section>

        {/* CHART */}
        <section className="mt-10">
          {loading ? (
            <div className="h-72 animate-pulse rounded-2xl bg-secondary" />
          ) : (
            <PollutionChart data={data} />
          )}
        </section>

        {/* GRID CARDS */}
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold">Villes tunisiennes</h2>
              <p className="text-sm text-muted-foreground">{data.length} stations · données du jour</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.map((r) => <AqiCard key={r.ville} row={r} />)}
          </div>
        </section>

        {/* AI TOOLS */}
        <section className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PhotoDetector />
          <AiAssistant data={data} />
        </section>
      </main>

      <footer className="border-t border-border bg-card/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          AirTunisie · Données simulées à des fins de démonstration · Propulsé par l'IA
        </div>
      </footer>
    </div>
  );
};

const StatCard = ({
  icon, label, value, sub, accent,
}: { icon: React.ReactNode; label: string; value: string; sub: string; accent?: "danger" | "success" }) => (
  <div className="rounded-2xl border border-border bg-card p-5 shadow-glacier">
    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className={`mt-2 font-display text-3xl font-bold ${accent === "danger" ? "text-destructive" : accent === "success" ? "text-[hsl(var(--success))]" : ""}`}>
      {value}
    </div>
    <div className="text-sm text-muted-foreground">{sub}</div>
  </div>
);

export default Index;
