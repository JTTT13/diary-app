export function getHourOrder(startHour: number = 0): number[] {
  const base = Math.floor(startHour) % 24;
  return Array.from({ length: 24 }, (_, i) => (base + i) % 24);
}

export function getHeatmapColorClass(count: number, maxCount: number): string {
  // 空值改用更明顯的灰色實色，確保在白色背景上能看見格子
  if (count === 0) return 'bg-gray-100 dark:bg-gray-700/50';
  
  const intensity = maxCount > 0 ? count / maxCount : 0;
  
  // 7 層粉色深度，調整透明度讓層次更分明
  if (intensity <= 0.15) return 'bg-pink-200 dark:bg-pink-900/40';
  if (intensity <= 0.3) return 'bg-pink-300 dark:bg-pink-800/50';
  if (intensity <= 0.45) return 'bg-pink-400 dark:bg-pink-700/60';
  if (intensity <= 0.6) return 'bg-pink-500 dark:bg-pink-600/70';
  if (intensity <= 0.75) return 'bg-pink-600 dark:bg-pink-500/80';
  if (intensity <= 0.9) return 'bg-pink-700 dark:bg-pink-400/90';
  return 'bg-pink-800 dark:bg-pink-300';
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}