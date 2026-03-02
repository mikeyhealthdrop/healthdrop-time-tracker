'use client'

import { signOut } from '@/app/actions/auth'

interface TopBarProps {
  userName: string
  role: string
  orgName: string
}

export function TopBar({ userName, role, orgName }: TopBarProps) {
  return (
    <div className="bg-surface border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-sm">
          H
        </div>
        <span className="text-[15px] font-semibold text-text-primary hidden sm:inline">
          {orgName}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[13px] font-medium text-text-primary">{userName}</div>
          <div className="text-[11px] text-text-muted capitalize">{role}</div>
        </div>
        <button
          onClick={() => signOut()}
          className="text-[12px] text-text-secondary hover:text-text-primary border border-border rounded-sm px-3 py-1.5 hover:bg-surface-alt transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
