import { X, AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'warning' | 'info' | 'error'
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning',
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const typeStyles = {
    warning: {
      icon: <AlertTriangle size={24} className="text-amber-400" />,
      iconBg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
    },
    info: {
      icon: <AlertTriangle size={24} className="text-blue-400" />,
      iconBg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
    },
    error: {
      icon: <AlertTriangle size={24} className="text-red-400" />,
      iconBg: 'bg-red-500/10',
      border: 'border-red-500/30',
    },
  }

  const style = typeStyles[type]

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className={`relative w-full max-w-md bg-night-900 border ${style.border} rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-night-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${style.iconBg}`}>
              {style.icon}
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-night-800 text-night-500 hover:text-white rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-night-300 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-night-700">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 bg-night-800 text-night-300 text-sm font-medium rounded-xl hover:bg-night-700 hover:text-white transition-colors border border-night-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
