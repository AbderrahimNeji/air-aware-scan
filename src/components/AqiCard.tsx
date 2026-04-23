import { PollutionRow, aqiCategory } from "@/lib/pollution";
import { MapPin } from "lucide-react";

export const AqiCard = ({ row }: { row: PollutionRow }) => {
  const cat = aqiCategory(row.aqi);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:shadow-glacier hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {row.gouvernorat}
          </div>
          <h3 className="mt-1 font-display text-lg font-semibold">{row.ville}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${cat.bg}`}>{cat.label}</span>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-4xl font-bold" style={{ color: cat.color }}>{row.aqi}</span>
        <span className="text-xs text-muted-foreground">AQI</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
        <Metric label="PM2.5" value={row.pm25} unit="µg/m³" />
        <Metric label="NO₂" value={row.no2} unit="µg/m³" />
        <Metric label="O₃" value={row.o3} unit="µg/m³" />
      </div>
    </div>
  );
};

const Metric = ({ label, value, unit }: { label: string; value: number; unit: string }) => (
  <div className="rounded-lg bg-secondary/60 px-2 py-1.5">
    <div className="text-muted-foreground">{label}</div>
    <div className="font-medium text-foreground">{value} <span className="text-muted-foreground">{unit}</span></div>
  </div>
);
