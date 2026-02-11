import { Star, StarHalf } from 'lucide-react';
import { MouseEvent } from 'react';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: number;
}

export default function StarRating({ rating, onChange, size = 16 }: StarRatingProps) {
  const handleMouseMove = (e: MouseEvent<HTMLSpanElement>, star: number) => {
    if (!onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    // We don't update state here, just maybe cursor style or hover effect if we were using complex state
  };

  const handleClick = (e: MouseEvent<HTMLSpanElement>, star: number) => {
    if (!onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    const newRating = isLeftHalf ? star - 0.5 : star;

    // Toggle off if clicking same value?
    // standard behavior is usually just setting it. 
    // If we want toggle: onChange(newRating === rating ? 0 : newRating);
    onChange(newRating === rating ? 0 : newRating);
  };

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = rating >= star;
        const isHalf = rating >= star - 0.5 && rating < star;

        return (
          <span
            key={star}
            role={onChange ? 'button' : undefined}
            tabIndex={onChange ? 0 : undefined}
            onClick={(e) => handleClick(e, star)}
            onMouseMove={(e) => handleMouseMove(e, star)}
            className={`transition-colors relative ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
          >
            {/* Background empty star for layout/sizing */}
            <div className="relative">
              <Star
                size={size}
                className={
                  isFull
                    ? 'fill-amber-400 text-amber-400'
                    : isHalf
                      ? 'fill-transparent text-amber-400' // Half star replaces this
                      : 'text-slate-600'
                }
              />

              {/* Overlay Half Star if needed */}
              {isHalf && (
                <div className="absolute top-0 left-0 overflow-hidden text-amber-400">
                  <StarHalf size={size} className="fill-amber-400 text-amber-400" />
                </div>
              )}

              {/* 
                   Alternative approach: 
                   Lucide StarHalf is the *left* half. 
                   So if isHalf, we render StarHalf filled.
                   If isFull, we render Star filled.
                   If empty, we render Star outlined.
                */}
            </div>
          </span>
        );
      })}
    </div>
  );
}
