import { diffWords } from 'diff'

interface PromptDiffViewProps {
  originalPrompt: string
  improvedPrompt: string
}

export default function PromptDiffView({ originalPrompt, improvedPrompt }: PromptDiffViewProps) {
  if (!originalPrompt.trim() || !improvedPrompt.trim()) return null

  const parts = diffWords(originalPrompt, improvedPrompt)

  return (
    <div className="mt-3">
      <div className="rounded-lg border border-night-600 bg-night-900/70 p-3 text-sm leading-7 text-night-100 whitespace-pre-wrap break-words select-text">
        {parts.map((part, index) => {
          if (part.added)
            return (
              <span key={`part-${index}`} className="rounded bg-green-500/20 px-0.5 text-green-200">
                {part.value}
              </span>
            )

          if (part.removed)
            return (
              <span key={`part-${index}`} className="rounded bg-red-500/20 px-0.5 text-red-200">
                {part.value}
              </span>
            )

          return <span key={`part-${index}`}>{part.value}</span>
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-night-300">
        <span className="rounded bg-green-500/20 px-2 py-0.5 text-green-200">Added</span>
        <span className="rounded bg-red-500/20 px-2 py-0.5 text-red-200">Removed</span>
      </div>
    </div>
  )
}