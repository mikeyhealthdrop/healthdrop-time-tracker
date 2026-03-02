'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="max-w-[420px] mx-auto px-4 pt-10 text-center">
      <div className="bg-surface border border-border rounded-[10px] p-8 shadow-sm">
        <div className="text-[18px] font-bold text-text-primary mb-2">
          Something went wrong
        </div>
        <p className="text-[14px] text-text-secondary mb-6">
          There was a problem loading the dashboard. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold text-[14px] rounded-[10px] transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
