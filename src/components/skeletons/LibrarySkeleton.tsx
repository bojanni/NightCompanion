import SkeletonBlock from './SkeletonBlock'

export default function LibrarySkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-night-900 border border-night-700 rounded-2xl flex flex-col overflow-hidden">
            <SkeletonBlock className="aspect-[16/9] rounded-none border-0 border-b border-night-700/60" />

            <div className="p-5 pb-0">
              <div className="flex items-start justify-between mb-2 gap-3">
                <SkeletonBlock className="h-5 w-2/3 rounded-md" />
                <div className="flex items-center gap-1">
                  <SkeletonBlock className="w-7 h-7 rounded-lg" />
                  <SkeletonBlock className="w-7 h-7 rounded-lg" />
                  <SkeletonBlock className="w-7 h-7 rounded-lg" />
                </div>
              </div>

              <SkeletonBlock className="h-3 w-1/2 rounded-md mb-3" />
              <SkeletonBlock className="h-3 w-full rounded-md" />
              <SkeletonBlock className="h-3 w-11/12 rounded-md mt-2" />
              <SkeletonBlock className="h-3 w-2/3 rounded-md mt-2" />

              <div className="h-12 overflow-hidden mb-4 mt-4 flex flex-wrap gap-1">
                <SkeletonBlock className="h-5 w-12 rounded-full" />
                <SkeletonBlock className="h-5 w-14 rounded-full" />
                <SkeletonBlock className="h-5 w-10 rounded-full" />
              </div>
            </div>

            <div className="px-5 pb-5 mt-auto">
              <div className="rounded-xl border border-night-700 bg-night-950/40 p-3">
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <SkeletonBlock key={starIndex} className="w-4 h-4 rounded-sm" />
                  ))}
                  <SkeletonBlock className="h-3 w-10 rounded-md ml-1" />
                </div>
                <SkeletonBlock className="h-3 w-full rounded-md" />
                <SkeletonBlock className="h-3 w-5/6 rounded-md mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
