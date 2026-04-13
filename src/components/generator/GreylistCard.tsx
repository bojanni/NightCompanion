type GreylistCardProps = {
  greylistEnabled: boolean
  setGreylistEnabled: (value: boolean) => void
  greylistEntries: Array<{ word: string; weight: 1 | 2 | 3 | 4 | 5 }>
  setGreylistEntries: (value: Array<{ word: string; weight: 1 | 2 | 3 | 4 | 5 }>) => void
  greylistInput: string
  setGreylistInput: (value: string) => void
  greylistWeight: 1 | 2 | 3 | 4 | 5
  setGreylistWeight: (value: 1 | 2 | 3 | 4 | 5) => void
  addGreylistWord: () => void
  removeGreylistWord: (word: string) => void
  syncStatusText: string
  syncStatusClassName?: string
}

const GREYLIST_SUGGESTIONS = [
  'jellyfish',
  'neon',
  'cyber',
  'glowing',
  'futuristic',
  'holographic',
  'sci-fi',
  'chrome',
  'vaporwave',
  'laser',
]

export default function GreylistCard({
  greylistEnabled,
  setGreylistEnabled,
  greylistEntries,
  setGreylistEntries,
  greylistInput,
  setGreylistInput,
  greylistWeight,
  setGreylistWeight,
  addGreylistWord,
  removeGreylistWord,
  syncStatusText,
  syncStatusClassName,
}: GreylistCardProps) {
  const normalizeGreylistWord = (value: string) => value.trim().toLowerCase()

  const greylistWords = greylistEntries.map((entry) => entry.word)

  const greylistSuggestions = GREYLIST_SUGGESTIONS.filter((item) => {
    const normalizedInput = normalizeGreylistWord(greylistInput)
    if (!normalizedInput) return !greylistWords.includes(item)
    return item.includes(normalizedInput) && !greylistWords.includes(item)
  })

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Greylist</h2>
          <p className="text-xs text-slate-500 mt-1">Words the AI should try to avoid or use with low probability.</p>
        </div>
        <label className={`inline-flex cursor-pointer items-center rounded-full border px-2 py-1 text-xs font-medium transition-colors ${greylistEnabled ? 'border-green-500/60 bg-green-500/20 text-green-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
          <input
            type="checkbox"
            checked={greylistEnabled}
            onChange={(e) => setGreylistEnabled(e.target.checked)}
            className="mr-1 h-3.5 w-3.5 accent-green-500"
            aria-label="Enable greylist"
          />
          {greylistEnabled ? 'On' : 'Off'}
        </label>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <div>
          <input
            type="text"
            list="generator-greylist-suggestions"
            value={greylistInput}
            onChange={(e) => setGreylistInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              addGreylistWord()
            }}
            className="input"
            placeholder="Add word to greylist"
          />
          <datalist id="generator-greylist-suggestions">
            {greylistSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>
        <button type="button" onClick={addGreylistWord} className="btn-ghost border border-slate-700/50">
          Add
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Weight: 1 = never use · 5 = 5% chance</p>
        <select
          value={greylistWeight}
          onChange={(event) => setGreylistWeight(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
          className="input w-24"
          aria-label="Greylist weight"
          title="Greylist weight"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5</option>
        </select>
      </div>

      <p className={`mt-2 text-xs ${syncStatusClassName || 'text-slate-500'}`}>{syncStatusText}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {greylistEntries.length === 0 ? (
          <p className="text-xs text-slate-500">No greylist words added.</p>
        ) : (
          greylistEntries.map((entry) => (
            <span key={entry.word} className="tag-removable">
              {entry.word}
              <select
                value={entry.weight}
                onChange={(event) => {
                  const nextWeight = Number(event.target.value) as 1 | 2 | 3 | 4 | 5
                  setGreylistEntries(greylistEntries.map((item) => (
                    item.word === entry.word ? { ...item, weight: nextWeight } : item
                  )))
                }}
                className="ml-2 rounded bg-slate-900/60 px-2 py-0.5 text-[11px] text-slate-200 border border-slate-700/50"
                aria-label={`Weight for ${entry.word}`}
                title={`Weight for ${entry.word}`}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
              <button
                type="button"
                onClick={() => removeGreylistWord(entry.word)}
                className="rounded px-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                aria-label={`Remove ${entry.word}`}
              >
                x
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  )
}