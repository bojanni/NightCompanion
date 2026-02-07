import { X } from 'lucide-react';
import type { Tag } from '../lib/types';

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  onClick?: () => void;
  selected?: boolean;
}

export default function TagBadge({ tag, onRemove, onClick, selected }: TagBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      } ${selected ? 'ring-2 ring-white/30' : ''}`}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        borderColor: `${tag.color}40`,
        borderWidth: 1,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}
