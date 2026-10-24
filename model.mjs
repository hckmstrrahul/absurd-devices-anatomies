export const SCAN_SECONDS = 5;
export function telemetry(intensity, progress = 0, powered = true) {
  const energy = Math.max(0, Math.min(1, Number(intensity) / 100));
  const sample = Math.max(0, Math.min(1, progress));
  return {
    energy: powered ? energy : 0,
    vitality: powered ? Math.round(96 - 15 * energy * energy) : 0,
    toxicity: powered ? Math.round(12 + 42 * energy) : 0,
    growth: powered ? +(0.18 + energy * 0.74).toFixed(2) : 0,
    absorption: powered ? Math.round(18 + 74 * energy) : 0,
    progress: Math.round(sample * 100),
    frequency: powered ? +(142.1 + energy * 0.8).toFixed(2) : 0,
    power: powered ? +(1.2 + energy * 3.6).toFixed(1) : 0,
  };
}
