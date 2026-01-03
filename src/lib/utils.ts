import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 防抖函數
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 節流函數
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 格式化日期
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小時前`;
  if (minutes > 0) return `${minutes} 分鐘前`;
  return '剛剛';
}

// 計算字數 (提取共用邏輯)
export function calculateWordCount(text: string): number {
  // Remove HTML tags and &nbsp;
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  if (!cleanText) return 0;

  let totalCount = 0;

  // 1. CJK Characters & Punctuation (Including all full-width symbols)
  // \u3000-\u303F: CJK Symbols and Punctuation (。、)
  // \u4E00-\u9FFF: CJK Unified Ideographs (Common Kanji/Hanzi)
  // \uFF00-\uFFEF: Halfwidth and Fullwidth Forms (Full-width commas, etc.)
  const cjkAndSymbols = cleanText.match(/[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF\u3040-\u309F\u30A0-\u30FF]/g);
  if (cjkAndSymbols) totalCount += cjkAndSymbols.length;

  // 2. Remove CJK characters to isolate English/Numbers
  const nonCjkContent = cleanText.replace(/[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF\u3040-\u309F\u30A0-\u30FF]/g, ' ');
  
  // 3. Count English words (Standard splitting by whitespace)
  const englishWords = nonCjkContent
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0) // Count everything else as words if separated by space

  if (englishWords) totalCount += englishWords.length;

  return totalCount;
}

// HTML 轉純文本
export function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
