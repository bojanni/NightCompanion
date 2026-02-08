export function PromptSkeleton() {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse">
            <div className="flex items-start justify-between mb-2">
                {/* Title skeleton */}
                <div className="h-4 bg-slate-800 rounded w-1/2" />
                {/* Favorite button skeleton */}
                <div className="w-4 h-4 rounded bg-slate-800" />
            </div>

            {/* Content skeleton */}
            <div className="space-y-2 mb-3">
                <div className="h-3 bg-slate-700 rounded w-full" />
                <div className="h-3 bg-slate-700 rounded w-5/6" />
                <div className="h-3 bg-slate-700 rounded w-4/6" />
            </div>

            {/* Tags skeleton */}
            <div className="flex flex-wrap gap-1 mb-3">
                <div className="h-5 bg-slate-700 rounded-full w-16" />
                <div className="h-5 bg-slate-700 rounded-full w-20" />
            </div>

            {/* Rating skeleton */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-3 h-3 rounded bg-slate-800" />
                    ))}
                </div>
            </div>
        </div>
    );
}
