import SkeletonBlock from './SkeletonBlock'

export default function StyleProfilesSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="card p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <SkeletonBlock className="h-4 w-40 rounded-md" />
              <SkeletonBlock className="h-3 w-24 rounded-md mt-2" />
            </div>
            <div className="flex gap-1">
              <SkeletonBlock className="w-7 h-7 rounded-lg" />
              <SkeletonBlock className="w-7 h-7 rounded-lg" />
            </div>
          </div>

          <SkeletonBlock className="h-3 w-full rounded-md" />
          <SkeletonBlock className="h-3 w-11/12 rounded-md mt-2" />
          <SkeletonBlock className="h-3 w-2/3 rounded-md mt-3" />
        </div>
      ))}
    </div>
  )
}
