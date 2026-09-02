import type { BaselineWeek, SiteData, SiteMeta, Stage, TableRecord } from "./types";

/** The stage a table had reached on a given date (ISO yyyy-mm-dd).
 *  Dates are ISO so string comparison is chronological — no Date objects needed. */
export function stageAt(t: TableRecord, iso: string): Stage {
  if (t.modulesDate && t.modulesDate <= iso) return 4;
  if (t.torqueDate && t.torqueDate <= iso) return 3;
  if (t.structureDate && t.structureDate <= iso) return 2;
  if (t.anchorsDate && t.anchorsDate <= iso) return 1;
  return 0;
}

export type Snapshot = {
  /** exclusive counts — each table appears once, at the furthest stage reached */
  byStage: [number, number, number, number, number];
  /** cumulative counts — a table at stage 3 is counted in s1, s2 and s3 */
  cum: { s1: number; s2: number; s3: number; s4: number };
  /** weighted progress 0-1: 20% drilling + 45% structure + 35% modules */
  weighted: number;
};

export function snapshot(data: SiteData, iso: string): Snapshot {
  const byStage: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const t of data.tables) byStage[stageAt(t, iso)]++;
  const cum = {
    s1: byStage[1] + byStage[2] + byStage[3] + byStage[4],
    s2: byStage[2] + byStage[3] + byStage[4],
    s3: byStage[3] + byStage[4],
    s4: byStage[4],
  };
  const n = data.meta.totalTables;
  const m = data.meta;
  const weighted =
    m.weightAnchors * (cum.s1 / n) +
    m.weightStructure * (cum.s2 / n) +
    m.weightModules * (cum.s4 / n);
  return { byStage, cum, weighted };
}

/** Latest record of any kind — the true data date, which is NOT the workbook's
 *  cut-off cell. Every figure in the app is computed at this date. */
export function dataDate(data: SiteData): string {
  let max = "";
  for (const t of data.tables) {
    for (const d of [t.anchorsDate, t.structureDate, t.torqueDate, t.modulesDate]) {
      if (d && d > max) max = d;
    }
  }
  return max;
}

export function firstDate(data: SiteData): string {
  let min = "9999-12-31";
  for (const t of data.tables) {
    for (const d of [t.anchorsDate, t.structureDate, t.torqueDate, t.modulesDate]) {
      if (d && d < min) min = d;
    }
  }
  return min;
}

/** Week-ending dates (Sundays) spanning the first record to the last. */
export function weekEnds(data: SiteData): string[] {
  const out: string[] = [];
  const end = dataDate(data);
  const d = new Date(firstDate(data) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7));
  while (d.toISOString().slice(0, 10) <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  if (out[out.length - 1] !== end) out.push(end);
  return out;
}

/** Baseline percent (0-1) at any date, linearly interpolated on the P6 weekly series. */
export function baselineAt(baseline: BaselineWeek[], iso: string): number {
  let prev = baseline[0];
  for (const b of baseline) {
    if (b.date >= iso) {
      if (b.date === iso || prev === b) return b.blOverall / 100;
      const t0 = Date.parse(prev.date);
      const t1 = Date.parse(b.date);
      const tx = Date.parse(iso);
      return (prev.blOverall + ((b.blOverall - prev.blOverall) * (tx - t0)) / (t1 - t0)) / 100;
    }
    prev = b;
  }
  return baseline[baseline.length - 1].blOverall / 100;
}

export type RateReading = {
  /** tables erected inside the rolling window */
  count: number;
  /** tables per day achieved */
  achieved: number;
  /** tables per day the P6 requires (CNS8200) */
  required: number;
  /** achieved / required */
  compliance: number;
  windowFrom: string;
};

export function structureRate(data: SiteData, iso = dataDate(data)): RateReading {
  const start = new Date(iso + "T00:00:00Z");
  start.setUTCDate(start.getUTCDate() - data.meta.rollingWindowDays);
  const from = start.toISOString().slice(0, 10);
  const count = data.tables.filter(
    (t) => t.structureDate && t.structureDate > from && t.structureDate <= iso,
  ).length;
  const achieved = count / data.meta.rollingWindowDays;
  const required = data.meta.requiredRateTablesPerDay;
  return { count, achieved, required, compliance: achieved / required, windowFrom: from };
}

export type RowStatus = {
  row: number;
  n: number;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  pctAccepted: number;
  verdict: string;
};

export function rowStatus(data: SiteData, iso = dataDate(data)): RowStatus[] {
  const m = new Map<number, RowStatus>();
  for (let r = 1; r <= data.meta.rows; r++) {
    m.set(r, { row: r, n: 0, s1: 0, s2: 0, s3: 0, s4: 0, pctAccepted: 0, verdict: "" });
  }
  for (const t of data.tables) {
    const o = m.get(t.row);
    if (!o) continue;
    o.n++;
    const s = stageAt(t, iso);
    if (s >= 1) o.s1++;
    if (s >= 2) o.s2++;
    if (s >= 3) o.s3++;
    if (s >= 4) o.s4++;
  }
  return [...m.values()].map((o) => {
    o.pctAccepted = o.n ? o.s3 / o.n : 0;
    o.verdict =
      o.n === 0 ? "—"
      : o.s4 === o.n ? "Complete"
      : o.s3 === o.n ? "Released — modules may start"
      : o.s2 === o.n ? "Erected — awaiting OE inspection"
      : o.s2 > 0 ? `In erection (${o.s2}/${o.n})`
      : "Anchors only";
    return o;
  });
}

export type InverterStatus = {
  inverter: number;
  n: number;
  s2: number;
  s3: number;
  pctAccepted: number;
  modules: number;
};

export function inverterStatus(data: SiteData, iso = dataDate(data)): InverterStatus[] {
  const m = new Map<number, InverterStatus>();
  for (const t of data.tables) {
    if (!m.has(t.inverter)) {
      m.set(t.inverter, { inverter: t.inverter, n: 0, s2: 0, s3: 0, pctAccepted: 0, modules: 0 });
    }
    const o = m.get(t.inverter)!;
    o.n++;
    const s = stageAt(t, iso);
    if (s >= 2) o.s2++;
    if (s >= 3) o.s3++;
  }
  return [...m.values()]
    .sort((a, b) => a.inverter - b.inverter)
    .map((o) => {
      o.pctAccepted = o.s3 / o.n;
      o.modules = o.n * 28;
      return o;
    });
}

export type GeometryStats = {
  n: number;
  min: number;
  mean: number;
  p95: number;
  max: number;
  /** histogram in 2 mm bins, 0-1, 2-3, ... 14+ */
  bins: number[];
  binLabels: string[];
  withinAlert: number;
  nonConforming: number;
};

export function geometryStats(data: SiteData): GeometryStats {
  const v = data.tables
    .map((t) => t.diagDelta)
    .filter((x): x is number => typeof x === "number")
    .sort((a, b) => a - b);
  const bins = new Array(8).fill(0);
  const binLabels = Array.from({ length: 8 }, (_, i) => (i === 7 ? "14+" : `${i * 2}–${i * 2 + 1}`));
  for (const x of v) bins[Math.min(7, Math.floor(x / 2))]++;
  const mean = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  return {
    n: v.length,
    min: v[0] ?? 0,
    mean,
    p95: v[Math.min(v.length - 1, Math.floor(v.length * 0.95))] ?? 0,
    max: v[v.length - 1] ?? 0,
    bins,
    binLabels,
    withinAlert: v.filter((x) => x <= data.meta.alertMm).length,
    nonConforming: v.filter((x) => x > data.meta.rejectMm).length,
  };
}

export const STAGE_NAMES = [
  "Not started",
  "Ground anchors cast",
  "Steel structure erected",
  "Alignment + torque accepted",
  "PV modules installed",
] as const;

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1];
  return `${d}-${mon}-${y}`;
}

export function pct(v: number, d = 1): string {
  return `${(v * 100).toFixed(d)}%`;
}

export function num(v: number | null | undefined, d = 0): string {
  if (v == null) return "—";
  return v.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Guard used by the seed script and the loader alike. */
export function isSiteData(x: unknown): x is SiteData {
  if (!x || typeof x !== "object") return false;
  const d = x as Partial<SiteData>;
  return Array.isArray(d.tables) && Array.isArray(d.baseline) && !!d.meta;
}

export type { SiteData, SiteMeta, TableRecord, BaselineWeek, Stage };
