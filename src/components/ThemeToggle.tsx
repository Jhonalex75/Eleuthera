"use client";

import { useEffect, useState } from "react";

type Choice = "light" | "dark" | null;

/** Three states, matching the CSS: null = follow the OS, otherwise an explicit
 *  stamp on <html> that beats the media query in both directions. */
export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("afry-theme");
      if (saved === "light" || saved === "dark") {
        setChoice(saved);
        document.documentElement.setAttribute("data-theme", saved);
      }
    } catch {
      /* private mode or blocked storage — stay on the OS setting */
    }
  }, []);

  const toggle = () => {
    const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next: Choice = choice ? (choice === "dark" ? "light" : "dark") : sysDark ? "light" : "dark";
    setChoice(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("afry-theme", next);
    } catch {
      /* nothing to persist to — the stamp still applies for this visit */
    }
  };

  return (
    <button className="themebtn" type="button" onClick={toggle}>
      Theme
    </button>
  );
}
