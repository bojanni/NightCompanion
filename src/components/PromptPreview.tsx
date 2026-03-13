import { useMemo, useState } from 'react'

type PromptPreviewProps = {
  promptText: string
  negativePrompt?: string
  styleSnippet?: string
  styleNegative?: string
  model?: string
  maxWords?: number
  greylistWords?: string[]
  onSave?: () => void
  saveLabel?: string
  saveDisabled?: boolean
}

type Segment = {
  text: string
  isStyle: boolean
}

const DEFAULT_MAX_WORDS = 70

function splitTokens(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function getWordTone(wordCount: number, maxWords: number) {
  if (wordCount > maxWords) return 'text-red-400'
  if (wordCount >= Math.max(1, Math.floor(maxWords * 0.85))) return 'text-yellow-400'
  return 'text-green-400'
}

function buildCombinedSegments(mainText: string, styleText: string): Segment[] {
  const trimmedMain = mainText.trim()
  const trimmedStyle = styleText.trim()
  return [
    ...(trimmedMain ? [{ text: trimmedMain, isStyle: false }] : []),
    ...(trimmedStyle ? [{ text: trimmedStyle, isStyle: true }] : []),
  ]
}

function composeText(mainText: string, styleText: string) {
  return [mainText.trim(), styleText.trim()].filter(Boolean).join(', ')
}

function renderWithGreylist(text: string, greylistWords: string[], className = '') {
  if (!text) return <span className={className}>—</span>
  if (greylistWords.length === 0) return <span className={className}>{text}</span>

  const escaped = greylistWords
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (escaped.length === 0) return <span className={className}>{text}</span>

  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(pattern)

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isGreylisted = greylistWords.some((word) => word.toLowerCase() === part.toLowerCase())
        if (!isGreylisted) return <span key={`${part}-${index}`}>{part}</span>
        return (
          <span key={`${part}-${index}`} className="rounded bg-red-500/20 px-0.5 text-red-300">
            {part}
          </span>
        )
      })}
    </span>
  )
}

export default function PromptPreview({
  promptText,
  negativePrompt = '',
  styleSnippet = '',
  styleNegative = '',
  model = '',
  maxWords = DEFAULT_MAX_WORDS,
  greylistWords = [],
  onSave,
  saveLabel = 'Save',
  saveDisabled = false,
}: PromptPreviewProps) {
  const [copied, setCopied] = useState(false)

  const promptSegments = useMemo(
    () => buildCombinedSegments(promptText, styleSnippet),
    [promptText, styleSnippet]
  )
  const negativeSegments = useMemo(
    () => buildCombinedSegments(negativePrompt, styleNegative),
    [negativePrompt, styleNegative]
  )

  const combinedPrompt = useMemo(
    () => composeText(promptText, styleSnippet),
    [promptText, styleSnippet]
  )
  const combinedNegative = useMemo(
    () => composeText(negativePrompt, styleNegative),
    [negativePrompt, styleNegative]
  )
  const wordCount = useMemo(() => splitTokens(combinedPrompt).length, [combinedPrompt])
  const characterCount = combinedPrompt.length
  const wordToneClass = getWordTone(wordCount, maxWords)

  const handleCopy = async () => {
    if (!combinedPrompt) return
    const fullText = combinedNegative
      ? `${combinedPrompt}\n\nNegative: ${combinedNegative}`
      : combinedPrompt
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Prompt Preview</h3>
          <p className="text-xs text-night-400 mt-1">Live combined output as sent to NightCafe.</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-night-700/60 bg-night-900/50 p-3">
        {promptSegments.length === 0 ? (
          <p className="text-xs text-night-500">Type a prompt to see the combined preview.</p>
        ) : (
          <p className="text-xs text-night-100 leading-relaxed whitespace-pre-wrap">
            {promptSegments.map((segment, segmentIndex) => (
              <span key={`${segment.text}-${segmentIndex}`}>
                {segmentIndex > 0 ? ', ' : ''}
                {segment.isStyle ? (
                  <span className="rounded bg-purple-500/20 px-1 text-purple-200">
                    {renderWithGreylist(segment.text, greylistWords)}
                  </span>
                ) : (
                  renderWithGreylist(segment.text, greylistWords)
                )}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-night-700/60 bg-night-900/30 p-3">
        <p className="text-[11px] uppercase tracking-wide text-night-400">Negative</p>
        {negativeSegments.length === 0 ? (
          <p className="mt-1 text-xs text-night-500">—</p>
        ) : (
          <p className="mt-1 text-xs text-night-200 whitespace-pre-wrap leading-relaxed">
            {negativeSegments.map((segment, segmentIndex) => (
              <span key={`${segment.text}-${segmentIndex}`}>
                {segmentIndex > 0 ? ', ' : ''}
                {segment.isStyle ? (
                  <span className="rounded bg-purple-500/20 px-1 text-purple-200">{segment.text}</span>
                ) : (
                  segment.text
                )}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="mt-3 text-[11px] text-night-400 space-y-1">
        <p>Model: <span className="text-night-200">{model || '—'}</span></p>
        <p>
          Woordtelling: <span className={wordToneClass}>{wordCount}/{maxWords}</span>
          <span className="text-night-500"> · </span>
          Tekens: <span className="text-night-200">{characterCount}</span>
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!combinedPrompt}
          className={`btn-ghost border border-night-600/50 ${copied ? 'text-green-300 border-green-600/50 bg-green-900/20' : ''}`}
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="btn-ghost border border-night-600/50"
          >
            💾 {saveLabel}
          </button>
        )}
      </div>
    </div>
  )
}
