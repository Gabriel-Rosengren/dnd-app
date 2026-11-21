import { useEffect, useRef, type ReactNode } from "react";

/**
 * A card that briefly glows when someone else changes one of its fields,
 * so it's obvious what the DM (or player) just touched.
 */
export function Section({
  title,
  watch = [],
  remoteChanges = {},
  actions,
  children,
  className,
}: {
  title?: string;
  watch?: string[];
  remoteChanges?: Record<string, number>;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const stamp = Math.max(0, ...watch.map((k) => remoteChanges[k] ?? 0));

  useEffect(() => {
    if (!stamp || Date.now() - stamp > 2000) return;
    ref.current?.animate?.(
      [{ boxShadow: "0 0 0 3px var(--flash)" }, { boxShadow: "0 0 0 0 transparent" }],
      { duration: 1600, easing: "ease-out" },
    );
  }, [stamp]);

  return (
    <section ref={ref} className={`card ${className ?? ""}`}>
      {title || actions ? (
        <header className="card-header">
          {title ? <h2>{title}</h2> : null}
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}
