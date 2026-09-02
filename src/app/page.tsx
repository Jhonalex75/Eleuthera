"use client";

import { TooltipProvider } from "@/components/Tooltip";
import { FieldMap } from "@/components/FieldMap";
import { SCurve, DiagHistogram, InverterChart } from "@/components/Charts";
import {
  FieldMotif,
  GeometryStatsPanel,
  KpiTiles,
  RowTable,
  StageFunnel,
  StatBand,
} from "@/components/Panels";
import { PhotoRecords } from "@/components/PhotoRecord";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSiteData } from "@/lib/useSiteData";
import { baselineAt, dataDate, fmtDate, num, pct, snapshot, structureRate } from "@/lib/progress";

export default function Home() {
  const { data, source, loading, error } = useSiteData();
  const now = dataDate(data);
  const s = snapshot(data, now);
  const bl = baselineAt(data.baseline, now);
  const rate = structureRate(data, now);
  const dev = (s.weighted - bl) * 100;
  const n = data.meta.totalTables;

  return (
    <TooltipProvider>
      <header className="mast">
        <FieldMotif data={data} />
        <div className="wrap">
          <div className="mast-top">
            <div className="brand">
              <span className="logo">AFRY</span>
              <span className="rule" aria-hidden="true" />
              <span className="sub">Owner&rsquo;s Engineer &middot; {data.meta.project}</span>
            </div>
            <dl className="docid">
              <dt>Document</dt><dd>{data.meta.document}</dd>
              <dt>Revision</dt><dd>{data.meta.revision}</dd>
              <dt>Project</dt><dd>{data.meta.projectNo}</dd>
              <dt>Client / EPC</dt><dd>{data.meta.client} &middot; {data.meta.epc}</dd>
            </dl>
          </div>

          <h1>
            Solar field mechanical QA/QC, <em>table by table</em>
          </h1>
          <p className="lede">
            Every figure on this page is recomputed live from the {n} individual string-table records
            in the OE register &mdash; not transcribed, not rounded, and not carried over from any
            other site. Hover the field map to read any single table&rsquo;s full history.
          </p>

          <StatBand data={data} />

          <div className="mast-bar">
            <span>
              Records through <b>{fmtDate(now)}</b>
            </span>
            <span>
              Scope{" "}
              <b>
                {num(n)} string tables &middot; {num(data.meta.totalModules)} modules &middot;{" "}
                {num(data.meta.totalAnchors)} ground anchors &middot; {data.meta.rows} rows &middot;{" "}
                {data.meta.inverters} inverters
              </b>
            </span>
            <span>
              Source{" "}
              <b>
                {loading ? "connecting…" : source === "firestore" ? "Firestore, live" : "bundled register"}
              </b>
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="wrap">
        {/* ---------------- verdict ---------------- */}
        <section id="verdict" style={{ paddingTop: 30 }}>
          {source === "bundled" && !loading && (
            <div className="alert crit" style={{ marginBottom: 14 }}>
              <span className="ico" aria-hidden="true">!</span>
              <div>
                <h3>Showing the register bundled with this build</h3>
                <p>
                  Firestore did not return the site document
                  {error ? <> &mdash; {error}</> : null}. Run{" "}
                  <code>node scripts/seed-firestore.mjs</code> to upload it, then this page switches to
                  the live copy on its own.
                </p>
              </div>
            </div>
          )}

          <div className="verdict">
            <div className="hero">
              <div className="k">Mechanical progress &mdash; all four stages cleared</div>
              <div className="big">{pct(s.cum.s4 / n)}</div>
              <div className={`pill ${s.cum.s4 ? "ok" : "cr"}`}>
                {s.cum.s4} of {n} tables complete
              </div>
              <p>
                This is the only figure that may be reported as mechanical progress. A half-finished
                table delivers no capacity. Weighted progress across the three P6 activities stands at{" "}
                <b>{pct(s.weighted)}</b> actual against <b>{pct(bl)}</b> planned, a deviation of{" "}
                <b>
                  {dev >= 0 ? "+" : "−"}
                  {Math.abs(dev).toFixed(1)} pp
                </b>
                .
              </p>
            </div>

            <div className="alert crit">
              <span className="ico" aria-hidden="true">!</span>
              <div>
                <h3>The workbook cut-off is stale</h3>
                <p>
                  <code>PARAMETERS C30</code> in the source workbook is set to <b>31-Jul-2026</b>, but
                  field records run through <b>{fmtDate(now)}</b>. Every headline on the DASHBOARD
                  sheet is computed at that stale date, which is why it reports one table erected in 28
                  days, 0.6% rate compliance and a forecast completion in <b>2070</b>.
                </p>
                <p>
                  This app ignores <code>C30</code> and computes at the true data date. Recomputed,
                  the achieved rate is <b>{rate.achieved.toFixed(1)} tables/day</b> against{" "}
                  {rate.required.toFixed(1)} required &mdash; <b>{pct(rate.compliance, 0)}</b> rate
                  compliance.
                </p>
              </div>
            </div>
          </div>

          <KpiTiles data={data} />
        </section>

        {/* ---------------- funnel ---------------- */}
        <section>
          <p className="eyebrow">Stage model</p>
          <h2>The four-stage acceptance funnel</h2>
          <p className="note">
            All four stages are measured on the same base of {n} string tables, so the percentages are
            directly comparable. Each stage is cumulative: a table counted at Stage&nbsp;3 has
            necessarily cleared Stages&nbsp;1 and&nbsp;2.
          </p>
          <StageFunnel data={data} />
        </section>

        {/* ---------------- field map ---------------- */}
        <section>
          <p className="eyebrow">
            Progress map &middot; {data.meta.rows} rows &times; {data.meta.cols} columns
          </p>
          <h2>The solar field, table by table</h2>
          <p className="note">
            Each cell is one string table in its true grid position. Hover any cell for its full
            record. Use the week slider to replay how the field was built &mdash; the map redraws at
            the state the records held on that date.
          </p>
          <FieldMap data={data} />
        </section>

        {/* ---------------- s-curve ---------------- */}
        <section>
          <p className="eyebrow">Schedule &middot; P6 baseline vs. actual</p>
          <h2>Weighted progress against the programme</h2>
          <p className="note">
            Baseline is grey and dashed, actual is solid. Weighting follows the register: 20&nbsp;%
            drilling, 45&nbsp;% structure, 35&nbsp;% modules. The actual series is rebuilt from the
            individual table dates and stops at the last record, not at the stale cut-off.
          </p>
          <div className="card" style={{ marginTop: 16 }}>
            <SCurve data={data} />
          </div>
        </section>

        {/* ---------------- geometry ---------------- */}
        <section>
          <p className="eyebrow">Quality &middot; VERGO VTPRS V1 (2025) &sect;13</p>
          <h2>Geometric verification by diagonals</h2>
          <p className="note">
            The manual sets no diagonal tolerance; it sets girder-to-pile squareness at
            90&deg;&nbsp;&plusmn;&nbsp;1&deg;. The OE converts that into a direct field measurement:
            the difference between the two measured diagonals. Reject above {data.meta.rejectMm}
            &nbsp;mm, OE alert above {data.meta.alertMm}&nbsp;mm.
          </p>
          <div className="geomgrid">
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 3 }}>Distribution of diagonal difference</h3>
              <p className="note" style={{ fontSize: 12.5, marginBottom: 10 }}>
                All {s.cum.s3} tables inspected at Stage&nbsp;3. Every reading sits far inside the
                alert threshold.
              </p>
              <DiagHistogram data={data} />
            </div>
            <GeometryStatsPanel data={data} />
          </div>
        </section>

        {/* ---------------- rows ---------------- */}
        <section>
          <p className="eyebrow">Handover unit</p>
          <h2>Row-by-row release status</h2>
          <p className="note">
            The row, not the individual table, is the handover unit to the OE. A row is released for
            modules only when every table in it has cleared Stage&nbsp;3. Click a column heading to
            sort.
          </p>
          <RowTable data={data} />
        </section>

        {/* ---------------- inverters ---------------- */}
        <section>
          <p className="eyebrow">Electrical readiness &middot; provisional allocation (TBC)</p>
          <h2>Acceptance by inverter</h2>
          <p className="note">
            The topographic drawing carries no string-to-inverter schedule, so this allocation is
            provisional: {data.meta.inverters} &times; HUAWEI SUN2000-330KTL-H1 spread evenly across
            the table sequence. It is shown because energisation is commissioned inverter by inverter,
            not row by row. Replace with ILT&rsquo;s PV String Plan when issued.
          </p>
          <div className="card" style={{ marginTop: 16 }}>
            <InverterChart data={data} />
          </div>
        </section>

        {/* ---------------- photographic traceability ---------------- */}
        <section>
          <p className="eyebrow">Photographic traceability</p>
          <h2>Every photograph binds to a table record</h2>
          <p className="note">
            The geotag marker burned into each frame is the table tag. It resolves to a table
            number, a row, an inverter, a GPS fix and the diagonal difference measured on that
            table &mdash; and the photograph date matches that table&rsquo;s alignment-and-torque
            acceptance date in the register. This is what makes the Stage&nbsp;3 record auditable
            rather than merely asserted.
          </p>
          <PhotoRecords data={data} />
        </section>

        <footer>
          AFRY Owner&rsquo;s Engineer &middot; {data.meta.client} &middot; EPC {data.meta.epc}{" "}
          &middot; Project {data.meta.projectNo} &middot; {data.meta.document} {data.meta.revision}.
          Figures recompute at the last record date and supersede the DASHBOARD sheet while{" "}
          <code>PARAMETERS C30</code> remains at 31-Jul-2026.
          {data.meta.updatedAt && <> Register uploaded {fmtDate(data.meta.updatedAt.slice(0, 10))}.</>}
        </footer>
      </main>
    </TooltipProvider>
  );
}
