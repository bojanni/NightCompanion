import SkeletonBlock from './SkeletonBlock'

export default function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <SkeletonBlock className="w-10 h-10 rounded-xl" />
              <SkeletonBlock className="w-12 h-8 rounded-lg" />
            </div>
            <SkeletonBlock className="h-4 w-24 rounded-md" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <SkeletonBlock className="h-6 w-40 rounded-md" />
            <SkeletonBlock className="h-4 w-20 rounded-md" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-xl bg-night-800/60 p-3 border border-night-700/50">
                <SkeletonBlock className="h-4 w-40 rounded-md" />
                <SkeletonBlock className="h-3 w-10/12 mt-2 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <SkeletonBlock className="h-6 w-36 rounded-md" />
            <SkeletonBlock className="h-4 w-20 rounded-md" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-xl bg-night-800/60 p-3 border border-night-700/50 flex items-center gap-3">
                <SkeletonBlock className="w-10 h-10 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <SkeletonBlock className="h-4 w-24 rounded-md" />
                  <SkeletonBlock className="h-3 w-32 mt-2 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <SkeletonBlock className="h-6 w-52 rounded-md" />
          <SkeletonBlock className="h-4 w-20 rounded-md" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={index} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    </>
  )
}
