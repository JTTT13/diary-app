/**
 * Clamp how many list items to render on cold start to avoid jank on mobile WebView.
 * @param {number} saved
 * @param {{pageSize:number, maxInitial:number, total?:number}} opts
 */
export function clampVisibleCount(saved, opts) {
  const { pageSize, maxInitial, total } = opts
  const s = Number.isFinite(saved) ? Math.floor(saved) : pageSize
  const min = Math.max(pageSize, 1)
  const capped = Math.min(Math.max(s, min), maxInitial)
  if (typeof total === 'number' && Number.isFinite(total)) return Math.min(capped, total)
  return capped
}

/**
 * Schedule low-priority work.
 * @param {() => void} cb
 */
export function scheduleIdle(cb) {
  if (typeof window === 'undefined') return
  // @ts-ignore
  if (typeof window.requestIdleCallback === 'function') {
    // @ts-ignore
    window.requestIdleCallback(cb, { timeout: 300 })
    return
  }
  window.setTimeout(cb, 0)
}