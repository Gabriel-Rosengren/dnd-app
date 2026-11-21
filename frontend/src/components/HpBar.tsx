import type { Character } from "@dnd/shared";

export function HpBar({ hp }: { hp: Character["hitPoints"] }) {
  const pct = hp.max > 0 ? Math.min(100, (hp.current / hp.max) * 100) : 0;
  const tempPct = hp.max > 0 ? Math.min(100 - pct, (hp.temporary / hp.max) * 100) : 0;
  const tone = pct <= 25 ? "low" : pct <= 50 ? "mid" : "high";
  return (
    <div className="hpbar" role="meter" aria-valuemin={0} aria-valuemax={hp.max} aria-valuenow={hp.current} aria-label="Hit points">
      <div className={`hpbar-fill ${tone}`} style={{ width: `${pct}%` }} />
      <div className="hpbar-temp" style={{ left: `${pct}%`, width: `${tempPct}%` }} />
    </div>
  );
}
