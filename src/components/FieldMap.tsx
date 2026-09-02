"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useTooltip } from "./Tooltip";
import {
  STAGE_NAMES,
  fmtDate,
  inverterStatus,
  num,
  pct,
  snapshot,
  stageAt,
  weekEnds,
} from "@/lib/progress";
import type { SiteData, TableRecord } from "@/lib/types";

type Mode = "stage" | "diag" | "post" | "invacc";

const STAGE_VARS = ["--s0", "--s1", "--s2", "--s3", "--s4"];
const SEQ_VARS = ["--seq1", "--seq2", "--seq3", "--seq4", "--seq5", "--seq6"];
const V = (name: string) => `var(${name})`;

const CW = 30;
const CH = 15;
const GAP = 1.6;
const LEFT = 30;
const TOP = 16;

export function FieldMap({ data }: { data: SiteData }) {
  const tip = useTooltip();
  const weeks = useMemo(() => weekEnds(data), [data]);
  const [mode, setMode] = useState<Mode>("stage");
  const [wk, setWk] = useState(weeks.length - 1);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setWk(weeks.length - 1), [weeks.length]);

  useEffect(() => {
    if (!playing) return;
    setWk(0);
    timer.current = setInterval(() => {
      setWk((w) => {
        if (w + 1 >= weeks.length) {
          setPlaying(false);
          return weeks.length - 1;
        }
        return w + 1;
      });
    }, 700);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, weeks.length]);

  const iso = weeks[Math.min(wk, weeks.length - 1)] ?? weeks[weeks.length - 1];
  const invs = useMemo(() => inverterStatus(data, iso), [data, iso]);
  const snap = useMemo(() => snapshot(data, iso), [data, iso]);

  const colorOf = (t: TableRecord, stage: number): string => {
    if (mode === "stage") return V(STAGE_VARS[stage]);
    if (stage === 0) return V("--s0");
    if (mode === "diag") {
      if (typeof t.diagDelta !== "number") return V("--s0");
      return V(SEQ_VARS[Math.min(5, Math.floor(t.diagDelta / 3))]);
    }
    if (mode === "post") {
      if (t.postType < 0) return V("--s0");
      return V(SEQ_VARS[t.postType + 1]);
    }
    const a = invs.find((x) => x.inverter === t.inverter);
    return a ? V(SEQ_VARS[Math.min(5, Math.round(a.pctAccepted * 5))]) : V("--s0");
  };

  const { rows, cols } = data.meta;
  const w = LEFT + cols * (CW + GAP) + 8;
  const h = TOP + rows * (CH + GAP) + 6;

  const stageCounts = snap.byStage;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="ctrls">
        <div className="cg">
          <label htmlFor="colorby">Colour by</label>
          <select id="colorby" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="stage">Stage reached</option>
            <option value="diag">Diagonal difference</option>
            <option value="post">Post type (elevation)</option>
            <option value="invacc">Inverter % accepted</option>
          </select>
        </div>
        <div className="cg">
          <label htmlFor="wk">Week</label>
          <input
            type="range"
            id="wk"
            min={0}
            max={weeks.length - 1}
            value={wk}
            onChange={(e) => {
              setPlaying(false);
              setWk(+e.target.value);
            }}
          />
          <span className="wkread">{fmtDate(iso)}</span>
        </div>
        <button
          className="btn"
          type="button"
          aria-pressed={playing}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? "Stop" : "Replay build"}
        </button>
        <button
          className="btn"
          type="button"
          aria-pressed={showTable}
          onClick={() => setShowTable((s) => !s)}
        >
          Table view
        </button>
      </div>

      <div className="mapwrap">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width={w}
          height={h}
          style={{ maxWidth: w, width: "100%" }}
          role="img"
          aria-label={`Solar field progress map at ${fmtDate(iso)}`}
        >
          {Array.from({ length: cols }, (_, i) => (
            <text
              key={`c${i}`}
              x={LEFT + i * (CW + GAP) + CW / 2}
              y={TOP - 5}
              textAnchor="middle"
              className="axlab"
            >
              {i + 1}
            </text>
          ))}
          {Array.from({ length: rows }, (_, i) =>
            (i + 1) % 5 === 0 || i === 0 ? (
              <text
                key={`r${i}`}
                x={LEFT - 6}
                y={TOP + i * (CH + GAP) + CH - 3.5}
                textAnchor="end"
                className="rowlab"
              >
                {i + 1}
              </text>
            ) : null,
          )}
          {data.tables.map((t) => {
            const stage = stageAt(t, iso);
            const fill = colorOf(t, stage);
            const dim = mode === "stage" && hidden.has(stage);
            const a = invs.find((x) => x.inverter === t.inverter);
            return (
              <rect
                key={t.id}
                x={LEFT + (t.col - 1) * (CW + GAP)}
                y={TOP + (t.row - 1) * (CH + GAP)}
                width={CW}
                height={CH}
                rx={2}
                fill={fill}
                className={`cell${dim ? " dim" : ""}`}
                onMouseMove={(e) =>
                  tip.show(
                    {
                      title: `Table ${t.id}`,
                      swatch: fill,
                      rows: [
                        ["Position", `Row ${t.row} · Col ${t.col}`],
                        [
                          "Inverter",
                          `INV-${String(t.inverter).padStart(2, "0")} (${pct(a?.pctAccepted ?? 0, 0)} acc.)`,
                        ],
                        ["Post type", t.postType >= 0 ? data.postTypes[t.postType] : "—"],
                        ["Stage", `${stage} — ${STAGE_NAMES[stage]}`],
                        ["Anchors", fmtDate(t.anchorsDate)],
                        ["Structure", fmtDate(t.structureDate)],
                        ["Align+torque", fmtDate(t.torqueDate)],
                        ["Δ diagonal", typeof t.diagDelta === "number" ? `${t.diagDelta} mm` : "—"],
                      ],
                    },
                    e,
                  )
                }
                onMouseLeave={tip.hide}
              />
            );
          })}
        </svg>
      </div>

      <div className="legend">
        {mode === "stage" &&
          STAGE_NAMES.map((nm, i) =>
            i === 0 && stageCounts[0] === 0 ? null : (
              <button
                key={nm}
                type="button"
                className="lgi"
                aria-pressed={!hidden.has(i)}
                onClick={() =>
                  setHidden((prev) => {
                    const next = new Set(prev);
                    next.has(i) ? next.delete(i) : next.add(i);
                    return next;
                  })
                }
              >
                <span className="sw" style={{ background: V(STAGE_VARS[i]) }} />
                {i > 0 ? `Stage ${i} — ` : ""}
                {nm} <b>{stageCounts[i]}</b>
              </button>
            ),
          )}
        {mode === "diag" &&
          ["0–2", "3–5", "6–8", "9–11", "12–14", "15+"].map((lb, i) => (
            <span className="lgi" key={lb}>
              <span className="sw" style={{ background: V(SEQ_VARS[i]) }} />
              {lb} mm
            </span>
          ))}
        {mode === "post" &&
          data.postTypes.map((p, i) => (
            <span className="lgi" key={p}>
              <span className="sw" style={{ background: V(SEQ_VARS[i + 1]) }} />
              {p} <b>{data.tables.filter((t) => t.postType === i).length}</b>
            </span>
          ))}
        {mode === "invacc" &&
          ["0%", "20%", "40%", "60%", "80%", "100%"].map((lb, i) => (
            <span className="lgi" key={lb}>
              <span className="sw" style={{ background: V(SEQ_VARS[i]) }} />
              {lb}
            </span>
          ))}
        <span style={{ fontSize: 12.5, color: "var(--muted)", alignSelf: "center", marginLeft: 4 }}>
          {mode === "stage"
            ? "counts are exclusive — each table appears once, at the furthest stage it has reached"
            : mode === "diag"
              ? `grey = not yet inspected · OE alert threshold ${data.meta.alertMm} mm`
              : mode === "post"
                ? "ordered by pile elevation · grey = no post type on the drawing"
                : "share of each inverter’s tables accepted at Stage 3"}
        </span>
      </div>

      <p className="note" style={{ marginTop: 12, fontSize: 13 }}>
        State at <b>{fmtDate(iso)}</b>: {num(snap.cum.s1)} anchored · {num(snap.cum.s2)} erected ·{" "}
        {num(snap.cum.s3)} accepted · {num(snap.cum.s4)} with modules. Blank cells are grid positions
        that carry no table — the field is not a full rectangle.
      </p>

      {showTable && <RawTable data={data} />}
    </div>
  );
}

function RawTable({ data }: { data: SiteData }) {
  const [sort, setSort] = useState<{ k: keyof TableRecord; asc: boolean }>({ k: "id", asc: true });
  const rows = useMemo(() => {
    const c = [...data.tables];
    c.sort((a, b) => {
      const x = a[sort.k];
      const y = b[sort.k];
      if (x == null) return 1;
      if (y == null) return -1;
      return (x > y ? 1 : x < y ? -1 : 0) * (sort.asc ? 1 : -1);
    });
    return c;
  }, [data.tables, sort]);

  const cols: [keyof TableRecord, string, boolean][] = [
    ["id", "Table", true],
    ["row", "Row", true],
    ["col", "Col", true],
    ["inverter", "Inverter", true],
    ["postType", "Post type", false],
    ["anchorsDate", "Anchors", false],
    ["structureDate", "Structure", false],
    ["torqueDate", "Align + torque", false],
    ["diagDelta", "Δ diag (mm)", true],
  ];

  return (
    <div style={{ marginTop: 14 }}>
      <div className="tblwrap">
        <table>
          <caption className="vh">
            All {data.tables.length} string tables with position, inverter, dates and diagonal
            difference
          </caption>
          <thead>
            <tr>
              {cols.map(([k, label, isNum]) => (
                <th
                  key={String(k)}
                  className={`sortable${isNum ? " num" : ""}`}
                  onClick={() => setSort((s) => ({ k, asc: s.k === k ? !s.asc : true }))}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="num mono">{t.id}</td>
                <td className="num mono">{t.row}</td>
                <td className="num mono">{t.col}</td>
                <td className="mono">INV-{String(t.inverter).padStart(2, "0")}</td>
                <td className="mono">{t.postType >= 0 ? data.postTypes[t.postType] : "—"}</td>
                <td className="mono">{fmtDate(t.anchorsDate)}</td>
                <td className="mono">{fmtDate(t.structureDate)}</td>
                <td className="mono">{fmtDate(t.torqueDate)}</td>
                <td className="num mono">
                  {typeof t.diagDelta === "number" ? t.diagDelta : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
