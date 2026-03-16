import { useState, useEffect } from 'react'
import type { GenerationEntry, NewGenerationEntry } from '../types'
import { Star, StarHalf } from 'lucide-react'
import { invalidateDashboardCache } from '../lib/cacheEvents'

type LogFormData = Omit<NewGenerationEntry, 'createdAt' | 'updatedAt'>
type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; entry: GenerationEntry }

function getStarFill(rating: number, starIndex: number) {
  if (rating >= starIndex) return 'full'
  if (rating >= starIndex - 0.5) return 'half'
  return 'empty'
}

function isSameRating(left: number, right: number) {
  return Math.abs(left - right) < 0.001
}

function RatingStars({ rating }: { rating: number | null }) {
  const safeRating = rating ?? 0

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => {
        const fill = getStarFill(safeRating, value)
        return (
          <span key={value} className={fill === 'empty' ? 'text-night-600' : 'text-yellow-400'}>
            {fill === 'full' && <Star size={14} fill="currentColor" />}
            {fill === 'half' && <StarHalf size={14} fill="currentColor" />}
            {fill === 'empty' && <Star size={14} />}
          </span>
        )
      })}
      <span className="text-[10px] text-night-500 ml-1">{safeRating ? safeRating.toFixed(1) : '0.0'}</span>
    </div>
  )
}

export default function GenerationLog() {
  const [entries, setEntries] = useState<GenerationEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const fetchEntries = async () => {
    setLoading(true)
    const result = await window.electronAPI.generationLog.list()
    if (!result.error) setEntries(result.data!)
    setLoading(false)
  }

  useEffect(() => { fetchEntries() }, [])

  const handleDelete = async (id: number) => {
    await window.electronAPI.generationLog.delete(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
    invalidateDashboardCache()
  }

  const handleSubmit = async (data: LogFormData) => {
    if (form.mode === 'edit') {
      await window.electronAPI.generationLog.update(form.entry.id, data)
    } else {
      await window.electronAPI.generationLog.create(data)
    }
    await fetchEntries()
    invalidateDashboardCache()
    setForm({ mode: 'closed' })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 pt-8 pb-5 no-drag-region">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Generation Log</h1>
          <p className="text-sm text-night-400 mt-0.5">{entries.length} generation{entries.length !== 1 ? 's' : ''} logged</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-night-600/50">
            {(['grid', 'list'] as const).map((m) => (
              <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-1.5 text-xs transition-colors ${viewMode === m ? 'bg-night-700 text-white' : 'text-night-400 hover:text-white hover:bg-night-800'}`}>{m === 'grid' ? '⊞' : '☰'}</button>
            ))}
          </div>
          <button onClick={() => setForm({ mode: 'create' })} className="btn-primary"><span className="text-lg leading-none">+</span>Log Generation</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8 no-drag-region">
        {loading ? (
          <div className="flex items-center justify-center py-24"><div className="text-night-500 text-sm animate-pulse">Loading…</div></div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-night-800 border border-night-600/50 flex items-center justify-center mb-4"><span className="text-3xl text-night-500">⊞</span></div>
            <h3 className="text-lg font-medium text-night-200 mb-1">No generations logged yet</h3>
            <p className="text-sm text-night-500 mb-5 max-w-sm">Track your NightCafe creations, rate them, and link them to your prompts.</p>
            <button onClick={() => setForm({ mode: 'create' })} className="btn-primary"><span className="text-lg leading-none">+</span>Log first generation</button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {entries.map((e) => (
              <div key={e.id} className="card overflow-hidden group hover:border-night-500/70 transition-all duration-150">
                {e.thumbnailUrl ? (
                  <div className="aspect-square bg-night-800 overflow-hidden">
                    <img src={e.thumbnailUrl} alt="" className="w-full h-full object-cover" onError={(el) => { (el.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                ) : (
                  <div className="aspect-square bg-night-800 flex items-center justify-center"><span className="text-4xl text-night-600">⊞</span></div>
                )}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <RatingStars rating={e.rating} />
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setForm({ mode: 'edit', entry: e })} className="p-1 rounded text-night-400 hover:text-white hover:bg-night-700 text-xs">✎</button>
                      <button onClick={() => handleDelete(e.id)} className="p-1 rounded text-night-500 hover:text-red-400 hover:bg-night-700 text-xs">✕</button>
                    </div>
                  </div>
                  <p className="text-[10px] text-night-400 truncate">{e.promptSnapshot.slice(0, 60)}{e.promptSnapshot.length > 60 ? '…' : ''}</p>
                  {e.nightcafeUrl && <a href={e.nightcafeUrl} target="_blank" rel="noreferrer" className="text-[10px] text-glow-blue hover:underline mt-1 block truncate">View on NightCafe ↗</a>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="card px-4 py-3 flex items-center gap-4 group hover:border-night-500/70 transition-all duration-150">
                {e.thumbnailUrl ? <img src={e.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" onError={(el) => { (el.target as HTMLImageElement).style.display = 'none' }} /> : <div className="w-12 h-12 rounded-lg bg-night-800 flex items-center justify-center flex-shrink-0"><span className="text-night-600 text-lg">⊞</span></div>}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-night-300 truncate">{e.promptSnapshot || '(no prompt)'}</p>
                  {e.notes && <p className="text-[10px] text-night-500 truncate mt-0.5">{e.notes}</p>}
                </div>
                <div className="flex-shrink-0">
                  <RatingStars rating={e.rating} />
                </div>
                <span className="text-[10px] text-night-600 flex-shrink-0">{new Date(e.createdAt).toLocaleDateString()}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setForm({ mode: 'edit', entry: e })} className="p-1.5 rounded text-night-400 hover:text-white hover:bg-night-700 text-xs">✎</button>
                  <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded text-night-500 hover:text-red-400 hover:bg-night-700 text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {form.mode !== 'closed' && (
        <GenerationForm
          initial={form.mode === 'edit' ? form.entry : undefined}
          onSubmit={handleSubmit}
          onClose={() => setForm({ mode: 'closed' })}
        />
      )}
    </div>
  )
}

function GenerationForm({ initial, onSubmit, onClose }: { initial?: GenerationEntry; onSubmit: (d: LogFormData) => void; onClose: () => void }) {
  const [nightcafeUrl, setNightcafeUrl] = useState(initial?.nightcafeUrl ?? '')
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnailUrl ?? '')
  const [promptSnapshot, setPromptSnapshot] = useState(initial?.promptSnapshot ?? '')
  const [rating, setRating] = useState<number>(initial?.rating ?? 0)
  const [notes, setNotes] = useState(initial?.notes ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/80 backdrop-blur-sm animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-xl card border-night-600 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-night-700/50">
          <h2 className="text-base font-semibold text-white">{initial ? 'Edit Log Entry' : 'Log Generation'}</h2>
          <button onClick={onClose} className="text-night-500 hover:text-white p-1.5 rounded-lg hover:bg-night-700 text-sm">✕</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ nightcafeUrl, thumbnailUrl, promptSnapshot, rating: rating || null, notes, promptId: null }) }} className="px-6 py-5 space-y-4">
          <div><label className="label">NightCafe URL</label><input type="url" value={nightcafeUrl} onChange={e => setNightcafeUrl(e.target.value)} className="input" placeholder="https://nightcafe.studio/create/…" autoFocus /></div>
          <div><label className="label">Thumbnail URL</label><input type="url" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} className="input" placeholder="https://…" /></div>
          <div><label className="label">Prompt Used</label><textarea value={promptSnapshot} onChange={e => setPromptSnapshot(e.target.value)} className="textarea" rows={3} placeholder="Paste the prompt you used…" /></div>
          <div>
            <label className="label">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className={`relative w-9 h-9 rounded-lg border transition-colors ${rating >= n - 0.5 ? 'text-yellow-400 border-yellow-600/50 bg-yellow-900/20' : 'text-night-600 border-night-600/50 hover:text-night-400'}`}>
                  <button
                    type="button"
                    onClick={() => setRating((prev) => (isSameRating(prev, n - 0.5) ? 0 : n - 0.5))}
                    className="absolute inset-y-0 left-0 w-1/2 z-10"
                    aria-label={`Set rating ${n - 0.5}`}
                    title={`Set rating ${n - 0.5}`}
                  />
                  <button
                    type="button"
                    onClick={() => setRating((prev) => (isSameRating(prev, n) ? 0 : n))}
                    className="absolute inset-y-0 right-0 w-1/2 z-10"
                    aria-label={`Set rating ${n}`}
                    title={`Set rating ${n}`}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {getStarFill(rating, n) === 'full' && <Star size={16} fill="currentColor" />}
                    {getStarFill(rating, n) === 'half' && <StarHalf size={16} fill="currentColor" />}
                    {getStarFill(rating, n) === 'empty' && <Star size={16} />}
                  </div>
                </div>
              ))}
              <span className="text-xs text-night-400 min-w-[3rem] ml-1">{rating ? rating.toFixed(1) : '0.0'}/5</span>
            </div>
          </div>
          <div><label className="label">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="textarea" rows={2} placeholder="What worked, what didn't…" /></div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary">{initial ? 'Save changes' : 'Save entry'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
