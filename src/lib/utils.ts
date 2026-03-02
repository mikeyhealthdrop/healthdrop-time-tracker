/**
 * Format seconds into HH:MM:SS or H:MM:SS
 */
export function formatTimer(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Format minutes into a readable string like "2h 43m"
 */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

/**
 * Format a time string to local time like "9:04 AM"
 */
export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format a date string to a readable date like "Thursday, February 12, 2026"
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Calculate elapsed seconds between two dates, or from start to now
 */
export function getElapsedSeconds(start: string, end?: string | null): number {
  const startTime = new Date(start).getTime()
  const endTime = end ? new Date(end).getTime() : Date.now()
  return Math.max(0, Math.floor((endTime - startTime) / 1000))
}

/**
 * Get current time as ISO string
 */
export function nowISO(): string {
  return new Date().toISOString()
}

/**
 * Get start of today in ISO string (local timezone)
 */
export function startOfTodayISO(): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

/**
 * Get end of today in ISO string (local timezone)
 */
export function endOfTodayISO(): string {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  return now.toISOString()
}
