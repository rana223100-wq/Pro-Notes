import { Star, Pin, MoreVertical, Paperclip, Lock } from 'lucide-react';
import type { Note } from '@/types';
import { wordsInHtml, formatDate, formatTime } from '@/lib/notes';

interface NoteCardProps {
  note: Note;
  onOpen: () => void;
  onTogglePin: () => void;
  onToggleFavorite: () => void;
  onMenu: (e: React.MouseEvent) => void;
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  showLockBadge?: boolean;
}

export function NoteCard({
  note,
  onOpen,
  onTogglePin,
  onToggleFavorite,
  onMenu,
  selecting,
  selected,
  onToggleSelect,
  showLockBadge,
}: NoteCardProps) {
  const words = wordsInHtml(note.content);

  const handleLongPress = () => {
    if (onToggleSelect) onToggleSelect();
  };

  return (
    <div
      onClick={() => (selecting ? onToggleSelect?.() : onOpen())}
      onContextMenu={(e) => {
        if (onToggleSelect) {
          e.preventDefault();
          handleLongPress();
        }
      }}
      onTouchStart={() => {
        if (!onToggleSelect) return;
        (window as any).__pronotes_lp = setTimeout(handleLongPress, 500);
      }}
      onTouchEnd={() => clearTimeout((window as any).__pronotes_lp)}
      onTouchMove={() => clearTimeout((window as any).__pronotes_lp)}
      className="surface rounded-2xl p-4 transition-shadow hover:shadow-lg cursor-pointer relative"
      style={{ boxShadow: 'var(--shadow)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          {note.category}
        </span>
        <div className="flex items-center gap-1">
          {selecting && (
            <span
              className="mr-1 flex items-center justify-center rounded-md"
              style={{
                width: 20,
                height: 20,
                border: '2px solid var(--accent)',
                background: selected ? 'var(--accent)' : 'transparent',
              }}
            >
              {selected && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          )}
          {showLockBadge && note.locked && (
            <Lock size={15} className="text-muted" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className="p-1 rounded-md hover:bg-black/5"
            style={{ color: note.pinned ? 'var(--accent)' : 'var(--text-muted)' }}
            aria-label="pin"
          >
            <Pin size={15} fill={note.pinned ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="p-1 rounded-md hover:bg-black/5"
            style={{ color: note.favorite ? '#f59e0b' : 'var(--text-muted)' }}
            aria-label="favorite"
          >
            <Star size={15} fill={note.favorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMenu(e);
            }}
            className="p-1 rounded-md hover:bg-black/5 text-muted"
            aria-label="more"
          >
            <MoreVertical size={15} />
          </button>
        </div>
      </div>

      <h3 className="text-main font-semibold text-[15px] truncate">
        {note.locked ? 'Locked note' : (note.title || 'Untitled')}
      </h3>
      <p className="text-soft text-[13px] line-clamp-2 mt-0.5" style={{ lineHeight: 1.5 }}>
        {note.locked ? 'Content hidden' : (note.plain || 'No additional text')}
      </p>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-app">
        <span className="text-muted text-[11px]">
          {formatDate(note.createdAt)} · {formatTime(note.modifiedAt)}
        </span>
        <div className="flex items-center gap-2 text-muted text-[11px]">
          {note.attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip size={11} /> {note.attachments.length}
            </span>
          )}
          <span>{words} words</span>
        </div>
      </div>
    </div>
  );
}
