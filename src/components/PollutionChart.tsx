import { PollutionRow } from "@/lib/pollution";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EnvironmentWeights, scoreCityEnvironment } from "@/lib/environment-score";

export const PollutionChart = ({
  data,
  historyData,
  weights,
  urbanByCity,
}: {
  data: PollutionRow[];
  historyData?: PollutionRow[];
  weights: EnvironmentWeights;
  urbanByCity: Record<string, number>;
}) => {
  const pressureByCity = [...data]
    .map((row) => {
      const urbanPressure = urbanByCity[row.ville] ?? 0;
      const score = scoreCityEnvironment(row, urbanPressure, weights);
      return {
        ville: row.ville,
        pressure: score.riskScore,
      };
    })
    .sort((a, b) => b.pressure - a.pressure)
    .slice(0, 12);

  const trendByDate = Object.entries(
    (historyData ?? []).reduce((acc, row) => {
      if (!acc[row.date]) {
        acc[row.date] = { aqi: 0, pm25: 0, no2: 0, count: 0 };
      }
      acc[row.date].aqi += row.aqi;
      acc[row.date].pm25 += row.pm25;
      acc[row.date].no2 += row.no2;
      acc[row.date].count += 1;
      return acc;
    }, {} as Record<string, { aqi: number; pm25: number; no2: number; count: number }>),
  )
    .map(([date, v]) => ({
      date: date.slice(5),
      aqi: Math.round(v.aqi / v.count),
      pm25: Number((v.pm25 / v.count).toFixed(1)),
      no2: Number((v.no2 / v.count).toFixed(1)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-display text-lg font-semibold">Pression pollution par ville (top 12)</h3>
        <p className="text-sm text-muted-foreground">Score de risque global calibre avec ponderations actives.</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pressureByCity} margin={{ top: 8, right: 8, left: -16, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="ville" angle={-35} textAnchor="end" interval={0} stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="pressure" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-display text-lg font-semibold">Evolution multi-polluants (30 jours)</h3>
        <p className="text-sm text-muted-foreground">Moyennes quotidiennes de l'AQI, PM2.5 et NO2.</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendByDate} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="aqi" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="pm25" stroke="hsl(var(--warning))" strokeWidth={2.2} dot={false} />
              <Line type="monotone" dataKey="no2" stroke="hsl(var(--success))" strokeWidth={2.2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
