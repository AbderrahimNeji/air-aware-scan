export interface PollutionRow {
  ville: string;
  gouvernorat: string;
  latitude: number;
  longitude: number;
  date: string;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  so2: number;
  aqi: number;
}

export async function loadPollutionData(): Promise<PollutionRow[]> {
  const res = await fetch("/pollution_tunisie.csv");
  const text = await res.text();
  return parseCSV(text);
}

export async function loadPollutionHistoryData(): Promise<PollutionRow[]> {
  const res = await fetch("/pollution_tunisie_historique.csv");
  const text = await res.text();
  return parseCSV(text);
}

export function parseCSV(text: string): PollutionRow[] {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const obj: any = {};
    headers.forEach((h, i) => {
      const v = cols[i];
      obj[h] = isNaN(Number(v)) ? v : Number(v);
    });
    return obj as PollutionRow;
  });
}

export function aqiCategory(aqi: number): { label: string; color: string; bg: string } {
  if (aqi <= 50) return { label: "Bon", color: "hsl(var(--success))", bg: "bg-emerald-100 text-emerald-800" };
  if (aqi <= 100) return { label: "Modéré", color: "hsl(var(--warning))", bg: "bg-amber-100 text-amber-800" };
  if (aqi <= 150) return { label: "Mauvais (sensibles)", color: "hsl(25 95% 55%)", bg: "bg-orange-100 text-orange-800" };
  if (aqi <= 200) return { label: "Mauvais", color: "hsl(var(--danger))", bg: "bg-red-100 text-red-800" };
  if (aqi <= 300) return { label: "Très mauvais", color: "hsl(280 70% 50%)", bg: "bg-purple-100 text-purple-800" };
  return { label: "Dangereux", color: "hsl(0 80% 30%)", bg: "bg-red-200 text-red-900" };
}
