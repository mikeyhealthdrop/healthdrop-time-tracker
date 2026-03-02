'use client'

import { formatTime, formatDuration } from '@/lib/utils'
import type { TimeEntry } from '@/lib/types'

interface TodayLogProps {
  entries: (TimeEntry & { job?: { job_number: string } })[]
}

export function TodayLog({ entries }: TodayLogProps) {
  // Calculate durations
  const entryDetails = entries.map((entry) => {
    const start = new Date(entry.clock_in).getTime()
    const end = entry.clock_out ? new Date(entry.clock_out).getTime() : Date.now()
    const durationMinutes = (end - start) / 1000 / 60
    return { ...entry, durationMinutes }
  })

  const totalMinutes = entryDetails.reduce((sum, e) => sum + e.durationMinutes, 0)
  const lunchMinutes = entryDetails
    .filter((e) => e.entry_type === 'lunch')
    .reduce((sum, e) => sum + e.durationMinutes, 0)
  const workedMinutes = totalMinutes - lunchMinutes

  return (
    <div className="bg-surface border border-border rounded-[10px] p-5 shadow-sm mb-4">
      <div className="text-[14px] font-semibold text-text-primary mb-3">
        Today&apos;s Log
      </div>

      {entryDetails.map((entry) => (
        <div
          key={entry.id}
          className="flex justify-between items-center py-3 border-b border-border-light last:border-b-0"
        >
          <span className={`text-[14px] font-medium ${entry.entry_type === 'lunch' ? 'text-orange' : 'text-text-primary'}`}>
            {entry.entry_type === 'lunch'
              ? '☕ Lunch Break'
              : entry.job?.job_number || 'Unknown Job'
            }
          </span>
          <span className="text-[14px] text-text-secondary tabular-nums">
            {formatDuration(entry.durationMinutes)}
            {!entry.clock_out && (
              <span className="text-green text-[12px] ml-1">(active)</span>
            )}
          </span>
        </div>
      ))}

      {/* Totals */}
      <div className="flex justify-between items-center py-3 border-t border-border mt-1">
        <span className="text-[14px] font-semibold text-text-primary">Total Today</span>
        <span className="text-[14px] font-semibold text-text-primary tabular-nums">
          {formatDuration(totalMinutes)}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[12px] text-text-muted">Worked (excl. lunch)</span>
        <span className="text-[12px] text-text-muted tabular-nums">
          {formatDuration(workedMinutes)}
        </span>
      </div>
    </div>
  )
}
