import fs from "node:fs/promises";

const date = new Date().toISOString().slice(0, 10);
const HISTORY_DAYS = 90;

const endDateObj = new Date();
const startDateObj = new Date(endDateObj);
startDateObj.setUTCDate(startDateObj.getUTCDate() - (HISTORY_DAYS - 1));
const startDate = startDateObj.toISOString().slice(0, 10);
const endDate = endDateObj.toISOString().slice(0, 10);

const cities = [
  { ville: "Tunis", gouvernorat: "Tunis", latitude: 36.8065, longitude: 10.1815 },
  { ville: "Sfax", gouvernorat: "Sfax", latitude: 34.7406, longitude: 10.7603 },
  { ville: "Sousse", gouvernorat: "Sousse", latitude: 35.8245, longitude: 10.6346 },
  { ville: "Bizerte", gouvernorat: "Bizerte", latitude: 37.2744, longitude: 9.8739 },
  { ville: "Gabes", gouvernorat: "Gabes", latitude: 33.8815, longitude: 10.0982 },
  { ville: "Kairouan", gouvernorat: "Kairouan", latitude: 35.6781, longitude: 10.0963 },
  { ville: "Gafsa", gouvernorat: "Gafsa", latitude: 34.425, longitude: 8.7842 },
  { ville: "Ariana", gouvernorat: "Ariana", latitude: 36.8625, longitude: 10.1956 },
  { ville: "Ben Arous", gouvernorat: "Ben Arous", latitude: 36.7533, longitude: 10.2189 },
  { ville: "Monastir", gouvernorat: "Monastir", latitude: 35.778, longitude: 10.8262 },
  { ville: "Medenine", gouvernorat: "Medenine", latitude: 33.3548, longitude: 10.5055 },
  { ville: "Kasserine", gouvernorat: "Kasserine", latitude: 35.1676, longitude: 8.8365 },
  { ville: "Tataouine", gouvernorat: "Tataouine", latitude: 32.9297, longitude: 10.4517 },
  { ville: "Tozeur", gouvernorat: "Tozeur", latitude: 33.9197, longitude: 8.1335 },
  { ville: "Nabeul", gouvernorat: "Nabeul", latitude: 36.4513, longitude: 10.7357 },
  { ville: "Mahdia", gouvernorat: "Mahdia", latitude: 35.5047, longitude: 11.0622 },
  { ville: "Beja", gouvernorat: "Beja", latitude: 36.7256, longitude: 9.1817 },
  { ville: "Jendouba", gouvernorat: "Jendouba", latitude: 36.5011, longitude: 8.7803 },
  { ville: "Le Kef", gouvernorat: "Le Kef", latitude: 36.1675, longitude: 8.7048 },
  { ville: "Siliana", gouvernorat: "Siliana", latitude: 36.0844, longitude: 9.3708 },
  { ville: "Zaghouan", gouvernorat: "Zaghouan", latitude: 36.4028, longitude: 10.1433 },
  { ville: "Manouba", gouvernorat: "Manouba", latitude: 36.8081, longitude: 10.0956 },
  { ville: "Kebili", gouvernorat: "Kebili", latitude: 33.705, longitude: 8.969 },
  { ville: "Sidi Bouzid", gouvernorat: "Sidi Bouzid", latitude: 35.0381, longitude: 9.4858 }
];

function avg(values) {
  const valid = values.filter((x) => typeof x === "number" && Number.isFinite(x));
  if (!valid.length) return NaN;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function toAqi(pm25, pm10, no2, o3, co, so2) {
  const score =
    (pm25 / 25) * 100 * 0.35 +
    (pm10 / 50) * 100 * 0.2 +
    (no2 / 100) * 100 * 0.15 +
    (o3 / 100) * 100 * 0.15 +
    (co / 4) * 100 * 0.1 +
    (so2 / 40) * 100 * 0.05;
  return Math.max(1, Math.min(500, Math.round(score)));
}

function toNumber(value, divisor = 1) {
  if (!Number.isFinite(value)) return NaN;
  return value / divisor;
}

function normalizeRow(city, rowDate, values) {
  const pm25 = avg(values.pm25);
  const pm10 = avg(values.pm10);
  const no2 = avg(values.no2);
  const o3 = avg(values.o3);
  const coRaw = avg(values.co);
  const so2 = avg(values.so2);
  const usAqi = avg(values.usAqi);
  const co = toNumber(coRaw, 1000);
  const aqi = Number.isFinite(usAqi) ? Math.round(usAqi) : toAqi(pm25, pm10, no2, o3, co, so2);

  return {
    ville: city.ville,
    gouvernorat: city.gouvernorat,
    latitude: city.latitude,
    longitude: city.longitude,
    date: rowDate,
    pm25: Math.round(pm25),
    pm10: Math.round(pm10),
    no2: Math.round(no2),
    o3: Math.round(o3),
    co: Number(co.toFixed(2)),
    so2: Math.round(so2),
    aqi
  };
}

const dailyRows = [];
for (const city of cities) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.latitude}&longitude=${city.longitude}&hourly=pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide,us_aqi&start_date=${startDate}&end_date=${endDate}&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error for ${city.ville}: ${res.status}`);
  const data = await res.json();

  const h = data.hourly || {};
  const dailyBuckets = new Map();
  const times = h.time || [];
  for (let i = 0; i < times.length; i += 1) {
    const rowDate = String(times[i]).slice(0, 10);
    if (!dailyBuckets.has(rowDate)) {
      dailyBuckets.set(rowDate, {
        pm25: [],
        pm10: [],
        no2: [],
        o3: [],
        co: [],
        so2: [],
        usAqi: []
      });
    }
    const bucket = dailyBuckets.get(rowDate);

    bucket.pm25.push(toNumber((h.pm2_5 || [])[i]));
    bucket.pm10.push(toNumber((h.pm10 || [])[i]));
    bucket.no2.push(toNumber((h.nitrogen_dioxide || [])[i]));
    bucket.o3.push(toNumber((h.ozone || [])[i]));
    bucket.co.push(toNumber((h.carbon_monoxide || [])[i]));
    bucket.so2.push(toNumber((h.sulphur_dioxide || [])[i]));
    bucket.usAqi.push(toNumber((h.us_aqi || [])[i]));
  }

  const sortedDates = Array.from(dailyBuckets.keys()).sort();
  for (const rowDate of sortedDates) {
    dailyRows.push(normalizeRow(city, rowDate, dailyBuckets.get(rowDate)));
  }
}

const header = "ville,gouvernorat,latitude,longitude,date,pm25,pm10,no2,o3,co,so2,aqi";
const todayRows = dailyRows.filter((r) => r.date === date);
const todayLines = todayRows.map((r) =>
  [r.ville, r.gouvernorat, r.latitude, r.longitude, r.date, r.pm25, r.pm10, r.no2, r.o3, r.co, r.so2, r.aqi].join(",")
);
const historyLines = dailyRows
  .sort((a, b) => (a.date === b.date ? a.ville.localeCompare(b.ville) : a.date.localeCompare(b.date)))
  .map((r) => [r.ville, r.gouvernorat, r.latitude, r.longitude, r.date, r.pm25, r.pm10, r.no2, r.o3, r.co, r.so2, r.aqi].join(","));

await fs.writeFile("public/pollution_tunisie.csv", [header, ...todayLines].join("\n") + "\n", "utf8");
await fs.writeFile("public/pollution_tunisie_historique.csv", [header, ...historyLines].join("\n") + "\n", "utf8");
console.log(`CSV du jour genere: ${todayRows.length} lignes pour ${date}`);
console.log(`CSV historique genere: ${dailyRows.length} lignes de ${startDate} a ${endDate}`);
