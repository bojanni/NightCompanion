import type { ChangeEvent, RefObject } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import type { CharacterImage } from './types'

type CharacterImageUploaderProps = {
  formImages: CharacterImage[]
  uploading: boolean
  fileInputRef: RefObject<HTMLInputElement>
  onImageUpload: (e: ChangeEvent<HTMLInputElement>) => void
  onSetMainImage: (id: string) => void
  onRemoveImage: (image: CharacterImage) => void
}

export default function CharacterImageUploader({
  formImages,
  uploading,
  fileInputRef,
  onImageUpload,
  onSetMainImage,
  onRemoveImage,
}: CharacterImageUploaderProps) {
  return (
    <div className="space-y-2">
      <label className="label">Character Images</label>
      <div className="flex flex-wrap gap-2">
        {formImages.map((img) => (
          <div key={img.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-night-700 bg-night-900 group">
            <img src={img.url} className="w-full h-full object-cover" alt="Character preview" />
            <button
              type="button"
              onClick={() => onSetMainImage(img.id)}
              className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase transition-opacity ${img.isMain ? 'bg-black/50 opacity-100 text-white' : 'opacity-0 group-hover:opacity-100 bg-black/60 text-night-100'}`}
            >
              {img.isMain ? 'Main' : 'Set Main'}
            </button>
            <button
              type="button"
              onClick={() => onRemoveImage(img)}
              className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100"
              title="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-20 h-20 rounded-xl border border-dashed border-night-700 text-night-400 hover:text-night-200 hover:border-night-500 transition-colors flex flex-col items-center justify-center"
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          <span className="text-[10px] mt-1">Add</span>
        </button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onImageUpload}
        className="hidden"
        accept="image/*"
        multiple
        title="Upload character images"
      />
    </div>
  )
}
