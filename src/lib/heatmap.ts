export function getHourOrder(startHour: number = 0): number[] {
  const base = Math.floor(startHour) % 24;
  return Array.from({ length: 24 }, (_, i) => (base + i) % 24);
}

export function getHeatmapColorClass(count: number, maxCount: number): string {
  if (count <= 0) return "bg-gray-100 dark:bg-gray-800";

  const intensity = maxCount > 0 ? count / maxCount : 0;

  if (intensity <= 0.12) return "bg-blue-100 dark:bg-blue-950/25";
  if (intensity <= 0.25) return "bg-blue-200 dark:bg-blue-950/35";
  if (intensity <= 0.38) return "bg-blue-300 dark:bg-blue-900/45";
  if (intensity <= 0.5) return "bg-blue-400 dark:bg-blue-900/60";
  if (intensity <= 0.62) return "bg-blue-500 dark:bg-blue-800/70";
  if (intensity <= 0.75) return "bg-blue-600 dark:bg-blue-800/85";
  if (intensity <= 0.88) return "bg-blue-700 dark:bg-blue-700";
  return "bg-blue-800 dark:bg-blue-600";
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}