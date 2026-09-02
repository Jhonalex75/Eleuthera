"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type TipContent = { title: ReactNode; swatch?: string; rows: [string, ReactNode][] } | null;

type TipApi = {
  show: (c: NonNullable<TipContent>, e: { clientX: number; clientY: number }) => void;
  hide: () => void;
};

const Ctx = createContext<TipApi>({ show: () => {}, hide: () => {} });

export const useTooltip = () => useContext(Ctx);

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<TipContent>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);

  const show = useCallback<TipApi["show"]>((c, e) => {
    setContent(c);
    const w = box.current?.offsetWidth ?? 260;
    const h = box.current?.offsetHeight ?? 150;
    let x = e.clientX + 16;
    let y = e.clientY + 16;
    if (x + w > window.innerWidth - 10) x = e.clientX - w - 16;
    if (y + h > window.innerHeight - 10) y = e.clientY - h - 16;
    setPos({ x: Math.max(8, x), y: Math.max(8, y) });
  }, []);

  const hide = useCallback(() => setContent(null), []);

  return (
    <Ctx.Provider value={{ show, hide }}>
      {children}
      <div
        ref={box}
        className={`tip${content ? " on" : ""}`}
        style={{ left: pos.x, top: pos.y }}
        role="status"
        aria-live="polite"
      >
        {content && (
          <>
            <div className="th">
              {content.swatch && (
                <span className="dot" style={{ background: content.swatch }} aria-hidden="true" />
              )}
              {content.title}
            </div>
            <dl>
              {content.rows.map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>
    </Ctx.Provider>
  );
}
