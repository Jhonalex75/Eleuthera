"use client";

import { useMemo } from "react";
import { useTooltip } from "./Tooltip";
import {
  baselineAt,
  dataDate,
  fmtDate,
  geometryStats,
  inverterStatus,
  num,
  pct,
  snapshot,
  weekEnds,
} from "@/lib/progress";
import type { SiteData } from "@/lib/types";

const V = (n: string) => `var(${n})`;

/* ------------------------------------------------------------------ S-curve */
export function SCurve({ data }: { data: SiteData }) {
  const tip = useTooltip();
  const now = dataDate(data);
  const weeks = useMemo(() => weekEnds(data), [data]);
  const actual = useMemo(
    () => weeks.map((d) => ({ d, v: snapshot(data, d).weighted })),
    [data, weeks],
  );

  const W = 980;
  const H = 340;
  const M = { t: 14, r: 16, b: 34, l: 44 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const bl = data.baseline;
  const t0 = Date.parse(bl[0].date);
  const t1 = Date.parse(bl[bl.length - 1].date);
  const X = (iso: string) => M.l + ((Date.parse(iso) - t0) / (t1 - t0)) * iw;
  const Y = (v: number) => M.t + ih - v * ih;

  const blPath = bl.map((b, i) => `${i ? "L" : "M"}${X(b.date).toFixed(1)} ${Y(b.blOverall / 100).toFixed(1)}`).join(" ");
  const acLine = actual.map((a, i) => `${i ? "L" : "M"}${X(a.d).toFixed(1)} ${Y(a.v).toFixed(1)}`).join(" ");
  const acArea = `${acLine} L ${X(actual[actual.length - 1].d).toFixed(1)} ${Y(0)} L ${X(actual[0].d).toFixed(1)} ${Y(0)} Z`;
  const last = actual[actual.length - 1];
  const blNow = baselineAt(bl, now);

  return (
    <>
      <div className="chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weighted progress, P6 baseline versus actual">
          {[0, 1, 2, 3, 4].map((g) => (
            <g key={g}>
              <line x1={M.l} x2={W - M.r} y1={Y(g / 4)} y2={Y(g / 4)} stroke={V("--grid")} strokeWidth={1} />
              <text x={M.l - 8} y={Y(g / 4) + 3.5} textAnchor="end" className="tick">{g * 25}%</text>
            </g>
          ))}
          {bl.map((b, i) =>
            i % 4 ? null : (
              <text key={b.date} x={X(b.date)} y={H - 12} textAnchor="middle" className="tick">
                {fmtDate(b.date).slice(0, 6)}
              </text>
            ),
          )}
          <path d={blPath} fill="none" stroke={V("--baseline")} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" />
          <path d={acArea} fill={V("--s2")} opacity={0.12} />
          <path d={acLine} fill="none" stroke={V("--s3")} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          <line x1={X(now)} x2={X(now)} y1={M.t} y2={M.t + ih} stroke={V("--ink-2")} strokeWidth={1} strokeDasharray="2 3" opacity={0.55} />
          <text x={X(now)} y={M.t - 2} textAnchor="middle" className="tick" fill={V("--ink-2")}>data date</text>
          <circle cx={X(last.d)} cy={Y(last.v)} r={4.5} fill={V("--s3")} stroke={V("--surface")} strokeWidth={2} />
          <text x={X(last.d) + 9} y={Y(last.v) - 8} className="slab" fill={V("--ink")}>{pct(last.v)} actual</text>
          <text x={X(now) + 9} y={Y(blNow) - 8} className="slab" fill={V("--muted")}>{pct(blNow)} planned</text>
          <rect
            x={M.l} y={M.t} width={iw} height={ih} fill="transparent"
            onMouseMove={(e) => {
              const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
              const px = ((e.clientX - box.left) / box.width) * W;
              const ms = t0 + ((px - M.l) / iw) * (t1 - t0);
              let near = bl[0];
              for (const b of bl) {
                if (Math.abs(Date.parse(b.date) - ms) < Math.abs(Date.parse(near.date) - ms)) near = b;
              }
              const a = near.date <= now ? snapshot(data, near.date) : null;
              const dev = a ? a.weighted * 100 - near.blOverall : null;
              tip.show(
                {
                  title: `Week ${near.week} · ${fmtDate(near.date)}`,
                  rows: [
                    ["Baseline", `${near.blOverall.toFixed(1)}%`],
                    ["Actual", a ? pct(a.weighted) : "—"],
                    ["Deviation", dev == null ? "—" : `${dev >= 0 ? "+" : "−"}${Math.abs(dev).toFixed(1)} pp`],
                    ["BL structure", `${num(near.blStructure)} tables`],
                    ["Act. structure", a ? `${num(a.cum.s2)} tables` : "—"],
                  ],
                },
                e,
              );
            }}
            onMouseLeave={tip.hide}
          />
        </svg>
      </div>
      <div className="legend">
        <span className="lgi"><span className="sw" style={{ background: V("--baseline") }} />P6 baseline</span>
        <span className="lgi"><span className="sw" style={{ background: V("--s3") }} />Actual, weighted</span>
        <span style={{ fontSize: 12.5, color: "var(--muted)", alignSelf: "center", marginLeft: 4 }}>
          20% drilling + 45% structure + 35% modules, each measured against its own total
        </span>
      </div>
    </>
  );
}

/* ------------------------------------------------------- diagonal histogram */
export function DiagHistogram({ data }: { data: SiteData }) {
  const tip = useTooltip();
  const g = useMemo(() => geometryStats(data), [data]);
  const W = 560;
  const H = 210;
  const M = { t: 12, r: 12, b: 36, l: 32 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const max = Math.max(...g.bins, 1);
  const bw = iw / g.bins.length;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Distribution of diagonal difference">
        {[0, 1, 2, 3].map((k) => (
          <g key={k}>
            <line x1={M.l} x2={W - M.r} y1={M.t + ih - (k / 3) * ih} y2={M.t + ih - (k / 3) * ih} stroke={V("--grid")} strokeWidth={1} />
            <text x={M.l - 7} y={M.t + ih - (k / 3) * ih + 3.5} textAnchor="end" className="tick">
              {Math.round((max * k) / 3)}
            </text>
          </g>
        ))}
        {g.bins.map((n, i) => {
          const bh = (n / max) * ih;
          const x = M.l + i * bw + 3;
          const y = M.t + ih - bh;
          return (
            <g key={i}>
              {n > 0 && (
                <>
                  <rect
                    x={x} y={y} width={bw - 6} height={Math.max(bh, 2)} rx={3} fill={V("--s3")}
                    onMouseMove={(e) =>
                      tip.show(
                        {
                          title: `${g.binLabels[i]} mm`,
                          rows: [
                            ["Tables", String(n)],
                            ["Share", pct(n / g.n)],
                            ["vs alert", `${data.meta.alertMm} mm`],
                          ],
                        },
                        e,
                      )
                    }
                    onMouseLeave={tip.hide}
                  />
                  <text x={x + (bw - 6) / 2} y={y - 5} textAnchor="middle" className="slab" fill={V("--ink")}>{n}</text>
                </>
              )}
              <text x={M.l + i * bw + bw / 2} y={H - 18} textAnchor="middle" className="tick">{g.binLabels[i]}</text>
            </g>
          );
        })}
        <text x={M.l + iw / 2} y={H - 3} textAnchor="middle" className="tick">
          difference between the two measured diagonals (mm)
        </text>
      </svg>
    </div>
  );
}

/* --------------------------------------------------------- inverter readiness */
export function InverterChart({ data }: { data: SiteData }) {
  const tip = useTooltip();
  const inv = useMemo(() => inverterStatus(data), [data]);
  const W = 980;
  const H = 250;
  const M = { t: 14, r: 14, b: 46, l: 38 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const bw = iw / inv.length;
  const MAXN = Math.max(...inv.map((o) => o.n));

  return (
    <>
      <div className="chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tables per inverter by stage reached">
          {[0, 1, 2, 3, 4].map((k) => (
            <g key={k}>
              <line x1={M.l} x2={W - M.r} y1={M.t + ih - (k / 4) * ih} y2={M.t + ih - (k / 4) * ih} stroke={V("--grid")} strokeWidth={1} />
              <text x={M.l - 7} y={M.t + ih - (k / 4) * ih + 3.5} textAnchor="end" className="tick">
                {Math.round((MAXN * k) / 4)}
              </text>
            </g>
          ))}
          {inv.map((o, i) => {
            const x = M.l + i * bw + 2.5;
            const w = bw - 5;
            const segs: [string, number, string][] = [
              ["Anchors only", o.n - o.s2, V("--s1")],
              ["Erected, awaiting OE", o.s2 - o.s3, V("--s2")],
              ["Accepted", o.s3, V("--s3")],
            ];
            let acc = 0;
            const handlers = {
              onMouseMove: (e: React.MouseEvent) =>
                tip.show(
                  {
                    title: `INV-${String(o.inverter).padStart(2, "0")}`,
                    rows: [
                      ["Tables", String(o.n)],
                      ["Erected", String(o.s2)],
                      ["Accepted", String(o.s3)],
                      ["% accepted", pct(o.pctAccepted, 0)],
                      ["Modules", num(o.modules)],
                    ],
                  },
                  e,
                ),
              onMouseLeave: tip.hide,
            };
            return (
              <g key={o.inverter}>
                {segs.map(([nm, v, c]) => {
                  if (v <= 0) return null;
                  const bh = (v / MAXN) * ih;
                  const y = M.t + ih - ((acc + v) / MAXN) * ih;
                  acc += v;
                  return <rect key={nm} x={x} y={y} width={w} height={Math.max(bh - 2, 1.5)} rx={2} fill={c} {...handlers} />;
                })}
                {(i % 2 === 0 || o.s3 > 0) && (
                  <text x={x + w / 2} y={H - 30} textAnchor="middle" className="tick">
                    {String(o.inverter).padStart(2, "0")}
                  </text>
                )}
                {o.s3 > 0 && (
                  <text x={x + w / 2} y={M.t + ih - (o.n / MAXN) * ih - 6} textAnchor="middle" className="slab" fill={V("--ink")}>
                    {o.s3}
                  </text>
                )}
              </g>
            );
          })}
          <text x={M.l + iw / 2} y={H - 8} textAnchor="middle" className="tick">
            inverter · numbers above the bars are tables accepted at Stage 3
          </text>
        </svg>
      </div>
      <div className="legend">
        <span className="lgi"><span className="sw" style={{ background: V("--s1") }} />Stage 1 — anchors only</span>
        <span className="lgi"><span className="sw" style={{ background: V("--s2") }} />Stage 2 — erected, awaiting OE</span>
        <span className="lgi"><span className="sw" style={{ background: V("--s3") }} />Stage 3 — accepted</span>
      </div>
    </>
  );
}
