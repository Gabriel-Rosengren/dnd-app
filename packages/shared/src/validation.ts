export function calculateProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export function clampHitPoints(
  current: number,
  max: number,
  temporary: number = 0,
): { current: number; max: number; temporary: number } {
  return {
    current: Math.max(0, Math.min(current, max)),
    max,
    temporary: Math.max(0, temporary),
  };
}
