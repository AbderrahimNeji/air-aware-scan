import type { PollutionRow } from "@/lib/pollution";

export interface EnvironmentWeights {
  aqi: number;
  pm25: number;
  no2: number;
  o3: number;
  urban: number;
}

export interface UrbanSignalInput {
  ville: string;
  type: "poubelle" | "route" | "depot";
  severite: number;
  createdAt: string;
}

export interface RankedCity {
  row: PollutionRow;
  riskScore: number;
  globalScore: number;
  urbanPressure: number;
}

export const DEFAULT_ENV_WEIGHTS: EnvironmentWeights = {
  aqi: 30,
  pm25: 30,
  no2: 15,
  o3: 10,
  urban: 15,
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalize(value: number, reference: number) {
  if (reference <= 0) return 0;
  return clamp01(value / reference);
}

function safeWeightTotal(weights: EnvironmentWeights) {
  const total = weights.aqi + weights.pm25 + weights.no2 + weights.o3 + weights.urban;
  return total > 0 ? total : 1;
}

export function buildUrbanPressureByCity(signals: UrbanSignalInput[]): Record<string, number> {
  const now = Date.now();
  const byCity: Record<string, number> = {};

  for (const s of signals) {
    const ageDays = (now - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = ageDays <= 7 ? 1 : ageDays <= 30 ? 0.72 : 0.45;
    const typeFactor = s.type === "depot" ? 1.2 : s.type === "route" ? 1.1 : 1;
    const impact = s.severite * typeFactor * recencyFactor;
    byCity[s.ville] = (byCity[s.ville] ?? 0) + impact;
  }

  return byCity;
}

export function scoreCityEnvironment(
  row: PollutionRow,
  urbanPressure: number,
  weights: EnvironmentWeights,
): { riskScore: number; globalScore: number } {
  const total = safeWeightTotal(weights);

  const weightedRisk =
    weights.aqi * normalize(row.aqi, 200) +
    weights.pm25 * normalize(row.pm25, 55) +
    weights.no2 * normalize(row.no2, 100) +
    weights.o3 * normalize(row.o3, 120) +
    weights.urban * normalize(urbanPressure, 18);

  const riskScore = Math.round((weightedRisk / total) * 100);
  return { riskScore, globalScore: 100 - riskScore };
}

export function rankCitiesByEnvironment(
  rows: PollutionRow[],
  urbanByCity: Record<string, number>,
  weights: EnvironmentWeights,
): RankedCity[] {
  return rows
    .map((row) => {
      const urbanPressure = urbanByCity[row.ville] ?? 0;
      const score = scoreCityEnvironment(row, urbanPressure, weights);
      return {
        row,
        urbanPressure: Number(urbanPressure.toFixed(1)),
        riskScore: score.riskScore,
        globalScore: score.globalScore,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}
