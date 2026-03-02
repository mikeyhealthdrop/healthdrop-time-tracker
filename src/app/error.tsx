'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: '#f5f5f0' }}>
      <div className="text-center max-w-[400px]">
        <div className="w-12 h-12 bg-red rounded-lg flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
          !
        </div>
        <h2 className="text-[18px] font-bold text-text-primary mb-2">
          Something went wrong
        </h2>
        <p className="text-[14px] text-text-secondary mb-6">
          An unexpected error occurred. Please try again.
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
