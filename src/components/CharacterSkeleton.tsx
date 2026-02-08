export function CharacterSkeleton() {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-pulse">
            <div className="flex items-center gap-4 p-5">
                {/* Avatar skeleton */}
                <div className="w-16 h-16 rounded-xl bg-slate-800 flex-shrink-0" />

                <div className="flex-1 min-w-0 space-y-2">
                    {/* Name skeleton */}
                    <div className="h-4 bg-slate-800 rounded w-2/3" />
                    {/* Description skeleton */}
                    <div className="h-3 bg-slate-700 rounded w-full" />
                    {/* Stats skeleton */}
                    <div className="flex gap-3 mt-1.5">
                        <div className="h-3 bg-slate-700 rounded w-20" />
                        <div className="h-3 bg-slate-700 rounded w-16" />
                    </div>
                </div>

                {/* Action buttons skeleton */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-800" />
                    <div className="w-8 h-8 rounded-lg bg-slate-800" />
                    <div className="w-8 h-8 rounded-lg bg-slate-800" />
                </div>
            </div>
        </div>
    );
}
