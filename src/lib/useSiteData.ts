"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, SITE_DOC } from "./firebase";
import { isSiteData } from "./progress";
import type { SiteData } from "./types";
import bundled from "@/data/eleuthera-solar.json";

export type Source = "firestore" | "bundled";

export type SiteState = {
  data: SiteData;
  source: Source;
  /** true until Firestore has answered once */
  loading: boolean;
  error: string | null;
};

const FALLBACK = bundled as unknown as SiteData;

/**
 * Subscribes to the single site document and pushes every republish straight to
 * the open page. If Firestore is unreachable or the document has not been seeded
 * yet, the register bundled with the build is served instead, so the dashboard
 * never renders empty — but the banner says which source is on screen.
 */
export function useSiteData(): SiteState {
  const [state, setState] = useState<SiteState>({
    data: FALLBACK,
    source: "bundled",
    loading: true,
    error: null,
  });

  useEffect(() => {
    const ref = doc(db, SITE_DOC.collection, SITE_DOC.id);
    const stop = onSnapshot(
      ref,
      (snap) => {
        const raw = snap.data();
        if (snap.exists() && isSiteData(raw)) {
          setState({ data: raw, source: "firestore", loading: false, error: null });
        } else {
          setState({
            data: FALLBACK,
            source: "bundled",
            loading: false,
            error: "The site document has not been seeded yet.",
          });
        }
      },
      (err) => {
        setState({
          data: FALLBACK,
          source: "bundled",
          loading: false,
          error: err.message,
        });
      },
    );
    return stop;
  }, []);

  return state;
}
