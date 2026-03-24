import { useState, useEffect } from 'react'
import { LayoutGrid, Grid3X3, Grid2X2 } from 'lucide-react'

type GridDensitySelectorProps = {
  storageKey: string
  defaultValue?: number
}

const DENSITY_OPTIONS = [
  { cols: 2, icon: Grid2X2 },
  { cols: 3, icon: Grid3X3 },
  { cols: 4, icon: LayoutGrid },
] as const

export default function GridDensitySelector({ storageKey, defaultValue = 3 }: GridDensitySelectorProps) {
  const [activeCols, setActiveCols] = useState(() => {
    const stored = localStorage.getItem(storageKey)
    return stored ? Number(stored) : defaultValue
  })

  useEffect(() => {
    document.documentElement.style.setProperty('--cards-per-row', String(activeCols))
  }, [activeCols])

  const handleSelect = (cols: number) => {
    setActiveCols(cols)
    localStorage.setItem(storageKey, String(cols))
  }

  return (
    <div className="bg-night-900 border border-night-800 rounded-xl p-1 flex gap-1">
      {DENSITY_OPTIONS.map(({ cols, icon: Icon }) => (
        <button
          key={cols}
          type="button"
          onClick={() => handleSelect(cols)}
          className={
            activeCols === cols
              ? 'bg-night-700 text-white rounded-lg p-1.5'
              : 'text-night-500 hover:text-white rounded-lg p-1.5 transition-colors'
          }
          title={`${cols} columns`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  )
}
