import { useState } from 'react'
import type { Prompt } from '../types'

type Props = {
  prompt: Prompt
  onEdit: () => void
  onDelete: () => void
}

export default function PromptCard({ prompt, onEdit, onDelete }: Props) {
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.promptText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete()
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 2500)
    }
  }

  const preview =
    prompt.promptText.length > 140
      ? prompt.promptText.slice(0, 140) + '…'
      : prompt.promptText

  return (
    <div className="card p-5 flex flex-col gap-3 group hover:border-night-500/70 transition-all duration-150 animate-fade-in">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate leading-snug">{prompt.title}</h3>
          {prompt.model && (
            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-night-700 text-glow-soft border border-glow-purple/20 font-medium tracking-wide">
              {prompt.model}
            </span>
          )}

          {prompt.stylePreset && (
            <span className="inline-block mt-1 ml-2 text-[10px] px-1.5 py-0.5 rounded bg-night-700 text-night-200 border border-night-600/60 font-medium tracking-wide">
              Preset: {prompt.stylePreset}
            </span>
          )}
        </div>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={handleCopy}
            title="Copy prompt to clipboard"
            className={`p-1.5 rounded-lg transition-colors text-xs ${
              copied
                ? 'bg-green-900/50 text-green-400 border border-green-700/50'
                : 'text-night-400 hover:text-white hover:bg-night-700'
            }`}
          >
            {copied ? '✓' : '⎘'}
          </button>
          <button
            onClick={onEdit}
            title="Edit prompt"
            className="p-1.5 rounded-lg text-night-400 hover:text-white hover:bg-night-700 transition-colors text-xs"
          >
            ✎
          </button>
          <button
            onClick={handleDelete}
            title={confirmDelete ? 'Click again to confirm delete' : 'Delete prompt'}
            className={`p-1.5 rounded-lg transition-colors text-xs ${
              confirmDelete
                ? 'bg-red-900/60 text-red-300 border border-red-700/50'
                : 'text-night-500 hover:text-red-400 hover:bg-night-700'
            }`}
          >
            {confirmDelete ? '?' : '✕'}
          </button>
        </div>
      </div>

      {/* Prompt text preview */}
      <p className="text-xs text-night-300 leading-relaxed font-mono bg-night-900/50 rounded-lg px-3 py-2.5 border border-night-700/50">
        {preview}
      </p>

      {/* Negative prompt */}
      {prompt.negativePrompt && (
        <div className="text-[10px] text-night-500 leading-relaxed">
          <span className="text-night-600 font-medium mr-1">−</span>
          {prompt.negativePrompt.length > 80
            ? prompt.negativePrompt.slice(0, 80) + '…'
            : prompt.negativePrompt}
        </div>
      )}

      {/* Tags */}
      {prompt.tags && prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {prompt.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-night-700/40">
        {prompt.notes ? (
          <span
            className="text-[10px] text-night-500 truncate max-w-[60%]"
            title={prompt.notes}
          >
            {prompt.notes}
          </span>
        ) : (
          <span />
        )}
        <span className="text-[10px] text-night-600">
          {new Date(prompt.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}
