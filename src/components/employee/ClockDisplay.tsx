'use client'

import { useState, useEffect } from 'react'

interface ClockDisplayProps {
  isClockedIn: boolean
  isOnLunch: boolean
}

export function ClockDisplay({ isClockedIn, isOnLunch }: ClockDisplayProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="text-center py-6">
      <div className="text-[56px] font-bold text-text-primary tracking-tight tabular-nums leading-none">
        {timeStr}
      </div>
      <div className="text-[14px] text-text-secondary mt-1">{dateStr}</div>

      <div className="mt-4 inline-flex items-center gap-1.5">
        {isOnLunch ? (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-orange-light text-orange">
            <span className="w-2 h-2 rounded-full bg-current" />
            On Lunch
          </span>
        ) : isClockedIn ? (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-green-light text-green">
            <span className="w-2 h-2 rounded-full bg-current" />
            Clocked In
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-red-light text-red">
            <span className="w-2 h-2 rounded-full bg-current" />
            Clocked Out
          </span>
        )}
      </div>
    </div>
  )
}
