import { useState, useEffect } from 'react'
import type { StyleProfile, NewStyleProfile } from '../types'
import { invalidateDashboardCache } from '../lib/cacheEvents'
import StyleProfilesSkeleton from '../components/skeletons/StyleProfilesSkeleton'
import { PageContainer } from '../components/PageContainer'
import { useLanguage } from '../contexts/LanguageContext'

type ProfileFormData = Omit<NewStyleProfile, 'createdAt' | 'updatedAt'>
type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; profile: StyleProfile }

export default function StyleProfiles() {
  const { t } = useLanguage()
  const [profiles, setProfiles] = useState<StyleProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [error, setError] = useState<string | null>(null)

  const fetchProfiles = async () => {
    setLoading(true)
    const result = await window.electronAPI.styleProfiles.list()
    if (result.error) setError(result.error)
    else setProfiles(result.data!)
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => {
      void fetchProfiles()
    })
  }, [])

  const handleDelete = async (id: number) => {
    await window.electronAPI.styleProfiles.delete(id)
    setProfiles((prev) => prev.filter((p) => p.id !== id))
    invalidateDashboardCache()
  }

  const handleSubmit = async (data: ProfileFormData) => {
    if (form.mode === 'edit') {
      await window.electronAPI.styleProfiles.update(form.profile.id, data)
    } else {
      await window.electronAPI.styleProfiles.create(data)
    }
    await fetchProfiles()
    invalidateDashboardCache()
    setForm({ mode: 'closed' })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 pt-8 pb-5 no-drag-region">
        <PageContainer className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">{t('styleProfiles.title')}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{t('styleProfiles.subtitle')}</p>
          </div>
          <button onClick={() => setForm({ mode: 'create' })} className="btn-primary">
            <span className="text-lg leading-none">+</span>
            {t('styleProfiles.newProfile')}
          </button>
        </PageContainer>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8 no-drag-region">
        <PageContainer>
          {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-sm">{error}</div>}

          {loading ? (
            <StyleProfilesSkeleton />
          ) : profiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700/50 flex items-center justify-center mb-4">
                <span className="text-3xl text-slate-500">◈</span>
              </div>
              <h3 className="text-lg font-medium text-slate-300 mb-1">No style profiles yet</h3>
              <p className="text-sm text-slate-500 mb-5 max-w-sm">Save your favourite style combinations as reusable presets.</p>
              <button onClick={() => setForm({ mode: 'create' })} className="btn-primary"><span className="text-lg leading-none">+</span>Create first profile</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {profiles.map((p) => (
                <div key={p.id} className="card p-5 group hover:border-slate-600/70 transition-all duration-150">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                      {p.preferredModel && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-glow-soft border border-glow-purple/20 font-medium">{p.preferredModel}</span>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setForm({ mode: 'edit', profile: p })} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors text-xs">✎</button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors text-xs">✕</button>
                    </div>
                  </div>

                  {p.basePromptSnippet && (
                    <p className="text-xs text-slate-400 font-mono bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-800/50 mb-2">
                      {p.basePromptSnippet.slice(0, 120)}{p.basePromptSnippet.length > 120 ? '…' : ''}
                    </p>
                  )}

                  {p.commonNegativePrompts && (
                    <p className="text-[10px] text-slate-500">
                      <span className="text-slate-600 mr-1">−</span>
                      {p.commonNegativePrompts.slice(0, 80)}{p.commonNegativePrompts.length > 80 ? '…' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </PageContainer>
      </div>

      {form.mode !== 'closed' && (
        <StyleProfileForm
          initial={form.mode === 'edit' ? form.profile : undefined}
          onSubmit={handleSubmit}
          onClose={() => setForm({ mode: 'closed' })}
        />
      )}
    </div>
  )
}

function StyleProfileForm({ initial, onSubmit, onClose }: { initial?: StyleProfile; onSubmit: (d: ProfileFormData) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [basePromptSnippet, setBasePromptSnippet] = useState(initial?.basePromptSnippet ?? '')
  const [preferredModel, setPreferredModel] = useState(initial?.preferredModel ?? '')
  const [commonNegativePrompts, setCommonNegativePrompts] = useState(initial?.commonNegativePrompts ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-xl card border-slate-700 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
          <h2 className="text-base font-semibold text-white">{initial ? 'Edit Profile' : 'New Style Profile'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 text-sm">✕</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, basePromptSnippet, preferredModel, commonNegativePrompts, notes }) }} className="px-6 py-5 space-y-4">
          <div><label className="label">Name *</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="input" required placeholder="e.g. Painterly Dark Fantasy" autoFocus /></div>
          <div><label className="label">Base Prompt Snippet</label><textarea value={basePromptSnippet} onChange={e => setBasePromptSnippet(e.target.value)} className="textarea" rows={3} placeholder="oil painting, dark fantasy, intricate details…" /></div>
          <div><label className="label">Preferred Model</label><input type="text" value={preferredModel} onChange={e => setPreferredModel(e.target.value)} className="input" placeholder="e.g. Stable Diffusion XL" /></div>
          <div><label className="label">Common Negative Prompts</label><textarea value={commonNegativePrompts} onChange={e => setCommonNegativePrompts(e.target.value)} className="textarea" rows={2} placeholder="blurry, watermark, text…" /></div>
          <div><label className="label">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="textarea" rows={2} placeholder="When to use this style…" /></div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary">{initial ? 'Save changes' : 'Create profile'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
