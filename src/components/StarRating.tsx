import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: number;
}

export default function StarRating({ rating, onChange, size = 16 }: StarRatingProps) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star === rating ? 0 : star)}
          disabled={!onChange}
          className={`transition-colors ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
        >
          <Star
            size={size}
            className={
              star <= rating
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-600'
            }
          />
        </button>
      ))}
    </div>
  );
}
