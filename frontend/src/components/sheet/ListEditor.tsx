import type { ReactNode } from "react";

/** Generic editable list. Every change sends the whole array. */
export function ListEditor<T>({
  items,
  onChange,
  create,
  renderItem,
  addLabel,
  empty,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  renderItem: (item: T, set: (patch: Partial<T>) => void) => ReactNode;
  addLabel: string;
  empty?: string;
}) {
  return (
    <div className="list-editor">
      {items.length === 0 && empty ? <p className="muted small">{empty}</p> : null}
      {items.map((item, i) => (
        <div className="list-row" key={i}>
          <div className="list-row-body">
            {renderItem(item, (patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it))))}
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Remove"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn ghost small" onClick={() => onChange([...items, create()])}>
        + {addLabel}
      </button>
    </div>
  );
}
