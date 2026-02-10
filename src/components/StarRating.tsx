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
        <span
          key={star}
          role={onChange ? 'button' : undefined}
          tabIndex={onChange ? 0 : undefined}
          onClick={() => onChange?.(star === rating ? 0 : star)}
          onKeyDown={(e) => { if (onChange && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onChange(star === rating ? 0 : star); } }}
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
        </span>
      ))}
    </div>
  );
}
