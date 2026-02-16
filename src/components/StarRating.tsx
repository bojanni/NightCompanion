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
    <div className="flex gap-0.5 relative">
      {/* Define the gradient once */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="star-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#facc15" /> {/* yellow-400 */}
            <stop offset="100%" stopColor="#f59e0b" /> {/* amber-500 */}
          </linearGradient>
        </defs>
      </svg>

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
                    ? 'text-transparent' // Make text transparent so fill shows
                    : isHalf
                      ? 'text-transparent' // Half star replaces this
                      : 'text-slate-600'
                }
                fill={isFull ? "url(#star-gradient)" : "none"}
              />

              {/* Overlay Half Star if needed */}
              {isHalf && (
                <div className="absolute top-0 left-0 overflow-hidden pointer-events-none">
                  <StarHalf
                    size={size}
                    className="text-transparent"
                    fill="url(#star-gradient)"
                  />
                </div>
              )}
            </div>
          </span>
        );
      })}
    </div>
  );
}
