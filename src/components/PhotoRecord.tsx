"use client";

import { PHOTOS } from "@/data/photos";
import { fmtDate } from "@/lib/progress";
import type { SiteData } from "@/lib/types";

/**
 * Each photograph is bound to its table record, so the caption carries the row,
 * the inverter, the acceptance date and the measured diagonal difference rather
 * than a description someone typed. Where the register and the frame disagree,
 * the caption says so instead of hiding it.
 */
export function PhotoRecords({ data }: { data: SiteData }) {
  return (
    <div className="photos">
      {PHOTOS.map((p) => {
        const rec = p.table ? data.tables.find((t) => t.id === p.table) : null;
        const dateMatches =
          rec?.torqueDate && fmtDate(rec.torqueDate).slice(0, 11) === p.taken.slice(0, 11);

        return (
          <figure key={p.file}>
            <img
              src={p.file}
              alt={`${p.activity}${rec ? `, table ${rec.id} on row ${rec.row}` : ""}, ${p.taken}`}
              loading="lazy"
              width={1280}
              height={960}
            />
            <figcaption>
              <div className="ct">
                {p.marker ? (
                  <span className="tag">{p.marker}</span>
                ) : (
                  <span className="tag" style={{ background: "var(--warn)", color: "#3a2800" }}>
                    no tag
                  </span>
                )}
                <span>{p.activity}</span>
              </div>
              <dl>
                <dt>Date &amp; time</dt>
                <dd>{p.taken}</dd>
                {rec ? (
                  <>
                    <dt>Table</dt>
                    <dd>
                      {rec.id} · Row {rec.row} · Col {rec.col}
                    </dd>
                    <dt>Inverter</dt>
                    <dd>INV-{String(rec.inverter).padStart(2, "0")}</dd>
                    <dt>Accepted</dt>
                    <dd>{fmtDate(rec.torqueDate)}</dd>
                    <dt>Δ diagonal</dt>
                    <dd>{typeof rec.diagDelta === "number" ? `${rec.diagDelta} mm` : "—"}</dd>
                  </>
                ) : (
                  <>
                    <dt>Table</dt>
                    <dd>tag not legible</dd>
                  </>
                )}
                <dt>Position</dt>
                <dd>{p.gps}</dd>
                <dt>Bearing</dt>
                <dd>{p.bearing}</dd>
              </dl>
              {rec && !dateMatches && (
                <span className="pill wa">
                  Frame date differs from the acceptance date on record
                </span>
              )}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
