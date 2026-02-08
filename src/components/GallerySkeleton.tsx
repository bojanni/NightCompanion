export function GallerySkeleton() {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-pulse">
            {/* Image skeleton */}
            <div className="aspect-square bg-slate-800" />

            <div className="p-3 space-y-2">
                {/* Title skeleton */}
                <div className="h-3 bg-slate-800 rounded w-3/4" />

                {/* Rating and collection skeleton */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="w-2.5 h-2.5 rounded bg-slate-800" />
                        ))}
                    </div>
                    <div className="h-2.5 bg-slate-700 rounded w-16" />
                </div>
            </div>
        </div>
    );
}
