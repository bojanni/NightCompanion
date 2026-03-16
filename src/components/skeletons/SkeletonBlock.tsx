type SkeletonBlockProps = {
  className?: string
}

export default function SkeletonBlock({ className = '' }: SkeletonBlockProps) {
  return <div className={`animate-pulse rounded-xl bg-night-800/80 border border-night-700/60 ${className}`.trim()} />
}
