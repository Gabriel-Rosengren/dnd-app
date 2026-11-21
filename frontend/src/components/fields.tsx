import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

/**
 * Inputs keep a local draft while focused so remote updates and in-flight
 * edits never move the cursor. Changes are committed after a short pause and
 * on blur.
 */
function useDraft<T>(value: T, commit: (v: T) => void, delay: number) {
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const schedule = (fn: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, delay);
  };
  const flush = (fn: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    fn();
  };

  return { draft, setDraft, schedule, flush, commitRef, value };
}

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;

export function TextInput({
  value,
  onCommit,
  delay = 350,
  ...rest
}: BaseProps & { value: string; onCommit: (v: string) => void; delay?: number }) {
  const d = useDraft(value, onCommit, delay);
  const send = (v: string) => {
    if (v !== value) d.commitRef.current(v);
  };
  return (
    <input
      {...rest}
      type="text"
      value={d.draft ?? value ?? ""}
      onFocus={(e) => {
        d.setDraft(value ?? "");
        rest.onFocus?.(e);
      }}
      onChange={(e) => {
        const v = e.target.value;
        d.setDraft(v);
        d.schedule(() => send(v));
      }}
      onBlur={(e) => {
        if (d.draft !== null) d.flush(() => send(d.draft!));
        d.setDraft(null);
        rest.onBlur?.(e);
      }}
    />
  );
}

export function NumberInput({
  value,
  onCommit,
  min,
  max,
  delay = 350,
  ...rest
}: BaseProps & {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  delay?: number;
}) {
  const d = useDraft(value, onCommit, delay);
  const send = (raw: string) => {
    if (raw.trim() === "" || raw === "-") return;
    let n = Math.trunc(Number(raw));
    if (!Number.isFinite(n)) return;
    if (min !== undefined) n = Math.max(Number(min), n);
    if (max !== undefined) n = Math.min(Number(max), n);
    if (n !== value) d.commitRef.current(n);
  };
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={d.draft ?? String(value ?? 0)}
      onFocus={(e) => {
        d.setDraft(String(value ?? 0));
        e.target.select();
      }}
      onChange={(e) => {
        const v = e.target.value.replace(/[^\d-]/g, "");
        d.setDraft(v);
        d.schedule(() => send(v));
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const next = (Number(d.draft ?? value) || 0) + (e.key === "ArrowUp" ? 1 : -1);
          d.setDraft(String(next));
          d.flush(() => send(String(next)));
        }
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      onBlur={() => {
        if (d.draft !== null) d.flush(() => send(d.draft!));
        d.setDraft(null);
      }}
    />
  );
}

export function TextArea({
  value,
  onCommit,
  rows = 4,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onCommit: (v: string) => void;
  rows?: number;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const d = useDraft(value, onCommit, 600);
  const send = (v: string) => {
    if (v !== value) d.commitRef.current(v);
  };
  return (
    <textarea
      rows={rows}
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={d.draft ?? value ?? ""}
      onFocus={() => d.setDraft(value ?? "")}
      onChange={(e) => {
        const v = e.target.value;
        d.setDraft(v);
        d.schedule(() => send(v));
      }}
      onBlur={() => {
        if (d.draft !== null) d.flush(() => send(d.draft!));
        d.setDraft(null);
      }}
    />
  );
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`field ${className ?? ""}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

/** Row of clickable pips, e.g. death saves or spell slots. */
export function Pips({
  total,
  filled,
  onChange,
  label,
  variant,
}: {
  total: number;
  filled: number;
  onChange: (n: number) => void;
  label: string;
  variant?: "danger" | "success";
}) {
  return (
    <span className="pips" role="group" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`pip ${i < filled ? "on" : ""} ${variant ?? ""}`}
          aria-pressed={i < filled}
          aria-label={`${label} ${i + 1}`}
          onClick={() => onChange(i < filled ? i : i + 1)}
        />
      ))}
    </span>
  );
}
