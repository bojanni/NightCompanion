import SkeletonBlock from './SkeletonBlock'

export default function GenerationLogSkeleton() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="card overflow-hidden">
          <SkeletonBlock className="aspect-square rounded-none border-0 border-b border-night-700/60" />
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <SkeletonBlock key={starIndex} className="w-3.5 h-3.5 rounded-sm" />
                ))}
              </div>
              <div className="flex gap-1">
                <SkeletonBlock className="w-6 h-6 rounded-md" />
                <SkeletonBlock className="w-6 h-6 rounded-md" />
              </div>
            </div>
            <SkeletonBlock className="h-3 w-full rounded-md" />
            <SkeletonBlock className="h-3 w-3/4 rounded-md mt-2" />
          </div>
        </div>
      ))}
    </div>
  )
}
