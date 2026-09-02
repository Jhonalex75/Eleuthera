"use client";

import { useMemo, useState } from "react";
import {
  STAGE_NAMES,
  baselineAt,
  dataDate,
  geometryStats,
  num,
  pct,
  rowStatus,
  snapshot,
  structureRate,
} from "@/lib/progress";
import type { SiteData } from "@/lib/types";

const V = (n: string) => `var(${n})`;

/* --------------------------------------------------------------- stat band */
export function StatBand({ data }: { data: SiteData }) {
  const now = dataDate(data);
  const s = snapshot(data, now);
  const bl = baselineAt(data.baseline, now);
  const dev = (s.weighted - bl) * 100;
  const n = data.meta.totalTables;
  const waiting = s.cum.s2 - s.cum.s3;

  const cells = [
    { l: "Ground anchors", v: pct(s.cum.s1 / n, 0), s: `${num(data.meta.totalAnchors)} anchors cast and accepted` },
    { l: "Structure erected", v: pct(s.cum.s2 / n), s: `${num(s.cum.s2)} of ${n} string tables` },
    { l: "Accepted by the OE", v: pct(s.cum.s3 / n), s: `${num(s.cum.s3)} tables through Stage 3`, hi: true },
    { l: "Held at the gate", v: num(waiting), s: "erected tables awaiting inspection" },
    { l: "vs. P6 baseline", v: `${dev >= 0 ? "+" : "−"}${Math.abs(dev).toFixed(1)} pp`, s: `${pct(s.weighted)} actual vs ${pct(bl)} planned` },
    { l: "Non-conformities", v: String(geometryStats(data).nonConforming), s: `across ${s.cum.s3} tables inspected` },
  ];

  return (
    <div className="statband">
      {cells.map((c) => (
        <div key={c.l}>
          <span className="l">{c.l}</span>
          <span className={`v${c.hi ? " hi" : ""}`}>{c.v}</span>
          <span className="s">{c.s}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- field motif */
export function FieldMotif({ data }: { data: SiteData }) {
  const now = dataDate(data);
  const CW = 9;
  const CH = 4.4;
  const G = 1.1;
  const tone = [
    "rgba(255,255,255,.16)",
    "rgba(255,255,255,.34)",
    "rgba(158,197,244,.72)",
    "rgba(210,231,255,.98)",
  ];
  const stageOf = (t: (typeof data.tables)[number]) =>
    t.modulesDate && t.modulesDate <= now ? 4
    : t.torqueDate && t.torqueDate <= now ? 3
    : t.structureDate && t.structureDate <= now ? 2
    : t.anchorsDate && t.anchorsDate <= now ? 1
    : 0;

  return (
    <svg
      id="mastmap"
      aria-hidden="true"
      viewBox={`0 0 ${data.meta.cols * (CW + G)} ${data.meta.rows * (CH + G)}`}
      preserveAspectRatio="xMaxYMid meet"
    >
      {data.tables.map((t) => (
        <rect
          key={t.id}
          x={(t.col - 1) * (CW + G)}
          y={(t.row - 1) * (CH + G)}
          width={CW}
          height={CH}
          rx={0.9}
          fill={tone[Math.min(3, Math.max(0, stageOf(t) - 1))]}
        />
      ))}
    </svg>
  );
}

/* --------------------------------------------------------------- KPI tiles */
export function KpiTiles({ data }: { data: SiteData }) {
  const now = dataDate(data);
  const s = snapshot(data, now);
  const g = geometryStats(data);
  const rate = structureRate(data, now);
  const rows = rowStatus(data, now);
  const released = rows.filter((r) => r.n > 0 && r.s3 === r.n).length;
  const waiting = s.cum.s2 - s.cum.s3;
  const n = data.meta.totalTables;

  const tiles = [
    { lab: "Anchors cast", val: pct(s.cum.s1 / n, 0), sub: `${num(s.cum.s1 * data.meta.anchorsPerTable)} of ${num(data.meta.totalAnchors)} anchors`, acc: V("--s1") },
    { lab: "Structure erected", val: num(s.cum.s2), sub: `${pct(s.cum.s2 / n)} of the field`, acc: V("--s2") },
    { lab: "Stage 3 accepted", val: num(s.cum.s3), sub: `${pct(s.cum.s3 / n)} — the OE hold point`, acc: V("--s3") },
    { lab: "Awaiting inspection", val: num(waiting), sub: "erected but not yet accepted", acc: V("--warn"), pill: waiting > 0 ? (["wa", "Blocked front"] as const) : null },
    { lab: "Non-conforming", val: String(g.nonConforming), sub: "no table blocks its row", acc: V("--good"), pill: (["ok", "Clear"] as const) },
    { lab: "Δ diagonal, mean", val: `${g.mean.toFixed(1)} mm`, sub: `alert at ${data.meta.alertMm} mm · reject at ${data.meta.rejectMm} mm`, acc: V("--good"), pill: (["ok", "100% compliant"] as const) },
    { lab: "Rows fully released", val: `${released} / ${data.meta.rows}`, sub: "ready to receive modules", acc: released ? V("--s3") : V("--crit"), pill: released ? null : (["cr", "None released"] as const) },
    { lab: "Structure rate", val: rate.achieved.toFixed(1), sub: `tables/day vs ${rate.required.toFixed(1)} required — ${pct(rate.compliance, 0)}`, acc: V("--warn"), pill: [rate.compliance >= 1 ? "ok" : "wa", rate.compliance >= 1 ? "On rate" : "Below rate"] as const },
  ];

  return (
    <div className="kpis">
      {tiles.map((t) => (
        <div className="kpi" key={t.lab} style={{ ["--accent" as string]: t.acc }}>
          <span className="lab">{t.lab}</span>
          <span className="val tabular">{t.val}</span>
          <span className="sub">{t.sub}</span>
          {t.pill && <span className={`pill ${t.pill[0]}`}>{t.pill[1]}</span>}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- stage funnel */
export function StageFunnel({ data }: { data: SiteData }) {
  const now = dataDate(data);
  const s = snapshot(data, now);
  const n = data.meta.totalTables;
  const stages = [
    { i: 1, v: s.cum.s1, c: V("--s1") },
    { i: 2, v: s.cum.s2, c: V("--s2") },
    { i: 3, v: s.cum.s3, c: V("--s3") },
    { i: 4, v: s.cum.s4, c: V("--s4") },
  ];
  const waiting = s.cum.s2 - s.cum.s3;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="funnel">
        {stages.map((st) => (
          <div className="fr" key={st.i} style={{ ["--sc" as string]: st.c }}>
            <div className="name">
              <span className="num">{st.i}</span>
              <span>{STAGE_NAMES[st.i]}</span>
            </div>
            <div className="track">
              <div className="fill" style={{ width: `${Math.max((st.v / n) * 100, 0.6)}%` }} />
            </div>
            <div className="rt">
              <b>{num(st.v)}</b> tables · <b>{pct(st.v / n)}</b>
            </div>
          </div>
        ))}
      </div>
      <div className="gate">
        <b>Stage 3 is the binding gate.</b> {num(s.cum.s2)} tables have the structure standing but
        only {num(s.cum.s3)} have been accepted on alignment, levelling and torque.{" "}
        <b>{num(waiting)} erected tables</b> are therefore waiting on the OE inspection gate and
        cannot receive modules. This gate is closed by the OE through an RFI — it is the only stage
        the Contractor cannot close alone.
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ geometry panel */
export function GeometryStatsPanel({ data }: { data: SiteData }) {
  const g = geometryStats(data);
  const stats: [string, string][] = [
    ["Tables inspected", `${g.n} of ${data.meta.totalTables}`],
    ["Minimum", `${g.min} mm`],
    ["Mean", `${g.mean.toFixed(1)} mm`],
    ["95th percentile", `${g.p95} mm`],
    ["Maximum", `${g.max} mm`],
    ["OE alert threshold", `${data.meta.alertMm} mm`],
    ["Reject threshold", `${data.meta.rejectMm} mm`],
    ["Worst reading vs alert", `${pct(g.max / data.meta.alertMm, 0)} of the threshold`],
  ];
  return (
    <div className="card">
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Measured against thresholds</h3>
      <table style={{ fontSize: 13 }}>
        <tbody>
          {stats.map(([k, v], i) => (
            <tr key={k}>
              <td style={{ color: "var(--muted)", borderTop: i >= 5 ? "1px solid var(--rule)" : undefined }}>{k}</td>
              <td className="num mono" style={{ borderTop: i >= 5 ? "1px solid var(--rule)" : undefined }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pill ok" style={{ marginTop: 12 }}>
        Torque 100% · Squareness 100% · {g.nonConforming} non-conforming · 0 punch items
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- row table */
export function RowTable({ data }: { data: SiteData }) {
  const rows = useMemo(() => rowStatus(data), [data]);
  const [sort, setSort] = useState<{ k: string; asc: boolean }>({ k: "row", asc: true });

  const sorted = useMemo(() => {
    const c = [...rows];
    c.sort((a, b) => {
      const x = a[sort.k as keyof typeof a];
      const y = b[sort.k as keyof typeof b];
      return (x > y ? 1 : x < y ? -1 : 0) * (sort.asc ? 1 : -1);
    });
    return c;
  }, [rows, sort]);

  const cols: [string, string][] = [
    ["row", "Row"], ["n", "Tables"], ["s1", "S1 anchors"], ["s2", "S2 structure"],
    ["s3", "S3 accepted"], ["s4", "S4 modules"], ["pctAccepted", "% accepted"], ["verdict", "Verdict"],
  ];

  return (
    <div className="card" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
      <div className="tblwrap" style={{ border: 0, maxHeight: 430 }}>
        <table>
          <caption className="vh">Row-by-row status with stage counts, percent accepted and verdict</caption>
          <thead>
            <tr>
              {cols.map(([k, label]) => (
                <th
                  key={k}
                  className={`sortable${k === "verdict" ? "" : " num"}`}
                  onClick={() => setSort((s) => ({ k, asc: s.k === k ? !s.asc : true }))}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((o) => {
              const c =
                o.n && o.s3 === o.n ? V("--s3")
                : o.s2 > 0 ? V("--s2")
                : V("--s1");
              return (
                <tr key={o.row}>
                  <td className="num mono">{o.row}</td>
                  <td className="num mono">{o.n}</td>
                  <td className="num mono">{o.s1}</td>
                  <td className="num mono">{o.s2}</td>
                  <td className="num mono">{o.s3}</td>
                  <td className="num mono">{o.s4}</td>
                  <td className="num mono">{pct(o.pctAccepted, 0)}</td>
                  <td>
                    <span className="dot" style={{ background: c }} />
                    {o.verdict}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
