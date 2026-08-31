export default function DashboardLoading() {
  return (
    <div className="max-w-[420px] mx-auto px-4 pt-5 pb-8 animate-pulse">
      {/* Greeting placeholder */}
      <div className="h-4 w-40 bg-gray-200 rounded mb-4" />

      {/* Clock card skeleton */}
      <div className="bg-white border border-gray-200 rounded-[10px] p-5 shadow-sm mb-4">
        <div className="h-12 w-32 bg-gray-200 rounded mx-auto mb-4" />
        <div className="h-10 w-full bg-gray-200 rounded mb-4" />
        <div className="h-12 w-full bg-gray-200 rounded-[10px]" />
      </div>
    </div>
  )
}
