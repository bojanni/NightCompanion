import { Star } from 'lucide-react'

type StarRatingProps = {
  rating: number
  onChange?: (rating: number) => void
  size?: number
  readonly?: boolean
}

export default function StarRating({ rating, onChange, size = 16, readonly = false }: StarRatingProps) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          onClick={() => {
            if (!readonly && onChange) {
              onChange(star === rating ? 0 : star)
            }
          }}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer'} transition-colors`}
        >
          <Star
            style={{ width: size, height: size }}
            className={
              star <= rating
                ? 'text-amber-400 fill-amber-400'
                : 'text-night-600'
            }
          />
        </button>
      ))}
    </div>
  )
}
