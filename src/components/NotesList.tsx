import { useState } from 'react';
import { Plus, Search, Pin, Star, Trash2, Lock, FileText } from 'lucide-react';
import type { Note, Category, Filter } from '../types';
import { formatDate } from '../lib/utils';

interface Props {
  notes: Note[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onTogglePin: (id: string) => void;
  onToggleFav: (id: string) => void;
  onTrash: (id: string) => void;
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
}

const CATEGORIES: Category[] = ['All', 'Work', 'Personal', 'Important', 'Checklist'];
const FILTERS: { key: Filter; label: string; icon: any }[] = [
  { key: 'All', label: 'All', icon: FileText },
  { key: 'Pin', label: 'Pinned', icon: Pin },
  { key: 'Favorites', label: 'Favorites', icon: Star },
  { key: 'Lock', label: 'Locked', icon: Lock },
  { key: 'Trash', label: 'Trash', icon: Trash2 },
];

export default function NotesList({
  notes,
  onOpen,
  onNew,
  onTogglePin,
  onToggleFav,
  onTrash,
  onRestore,
  onDeleteForever,
}: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const [filter, setFilter] = useState<Filter>('All');

  let filtered = notes;
  if (filter === 'Trash') {
    filtered = filtered.filter((n) => n.inTrash);
  } else {
    filtered = filtered.filter((n) => !n.inTrash);
    if (filter === 'Pin') filtered = filtered.filter((n) => n.pinned);
    if (filter === 'Favorites') filtered = filtered.filter((n) => n.favorite);
    if (filter === 'Lock') filtered = filtered.filter((n) => n.locked);
    if (category !== 'All') filtered = filtered.filter((n) => n.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (n) => n.title.toLowerCase().includes(q) || n.plain.toLowerCase().includes(q),
      );
    }
  }

  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);

  return (
    <div className="flex flex-col h-full app-bg">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 surface">
        <h1 className="text-2xl font-bold text-main mb-3">My Notes</h1>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl surface-soft border border-app outline-none text-sm text-main focus:border-blue-400"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 px-5 py-3 overflow-x-auto surface border-b border-app">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              category === c
                ? 'bg-blue-600 text-white'
                : 'surface-soft text-muted hover:bg-slate-200'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-5 py-2 overflow-x-auto border-b border-app">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
                filter === f.key
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-muted hover:bg-slate-100'
              }`}
            >
              <Icon size={15} />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
            <FileText size={48} className="opacity-30" />
            <p className="text-sm">No notes here yet</p>
          </div>
        )}

        {filter !== 'Trash' && pinned.length > 0 && (
          <p className="text-xs font-semibold text-muted uppercase tracking-wide px-1 mb-2 mt-1">Pinned</p>
        )}

        {filter !== 'Trash' && pinned.length > 0 && (
          <div className="space-y-2 mb-4">
            {pinned.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onOpen={() => onOpen(n.id)}
                onTogglePin={() => onTogglePin(n.id)}
                onToggleFav={() => onToggleFav(n.id)}
                onTrash={() => onTrash(n.id)}
              />
            ))}
          </div>
        )}

        {filter !== 'Trash' && rest.length > 0 && pinned.length > 0 && (
          <p className="text-xs font-semibold text-muted uppercase tracking-wide px-1 mb-2">Others</p>
        )}

        {filter !== 'Trash' && (
          <div className="space-y-2">
            {rest.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onOpen={() => onOpen(n.id)}
                onTogglePin={() => onTogglePin(n.id)}
                onToggleFav={() => onToggleFav(n.id)}
                onTrash={() => onTrash(n.id)}
              />
            ))}
          </div>
        )}

        {filter === 'Trash' && (
          <div className="space-y-2">
            {filtered.map((n) => (
              <TrashCard
                key={n.id}
                note={n}
                onRestore={() => onRestore(n.id)}
                onDeleteForever={() => onDeleteForever(n.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {filter !== 'Trash' && (
        <button
          onClick={onNew}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center hover:bg-blue-500 active:scale-95 transition"
        >
          <Plus size={26} />
        </button>
      )}
    </div>
  );
}

function NoteCard({
  note,
  onOpen,
  onTogglePin,
  onToggleFav,
  onTrash,
}: {
  note: Note;
  onOpen: () => void;
  onTogglePin: () => void;
  onToggleFav: () => void;
  onTrash: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="surface rounded-xl border border-app p-3.5 cursor-pointer hover:shadow-md transition group"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {note.pinned && <Pin size={13} className="text-blue-500 fill-blue-500 shrink-0" />}
            {note.locked && <Lock size={13} className="text-amber-500 shrink-0" />}
            <h3 className="text-sm font-semibold text-main truncate">
              {note.title || 'Untitled'}
            </h3>
          </div>
          <p className="text-xs text-muted mt-0.5 line-clamp-2">{note.plain || 'No content'}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-muted">{formatDate(note.modifiedAt)}</span>
            {note.attachments.length > 0 && (
              <span className="text-[10px] text-muted">
                · {note.attachments.length} file{note.attachments.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
            className="p-1 rounded-md hover:bg-slate-100"
          >
            <Star size={14} className={note.favorite ? 'fill-amber-400 text-amber-400' : 'text-muted'} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            className="p-1 rounded-md hover:bg-slate-100"
          >
            <Pin size={14} className={note.pinned ? 'fill-blue-500 text-blue-500' : 'text-muted'} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onTrash(); }}
            className="p-1 rounded-md hover:bg-red-50"
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TrashCard({
  note,
  onRestore,
  onDeleteForever,
}: {
  note: Note;
  onRestore: () => void;
  onDeleteForever: () => void;
}) {
  return (
    <div className="surface rounded-xl border border-app p-3.5 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-main truncate">{note.title || 'Untitled'}</h3>
        <p className="text-xs text-muted mt-0.5">{formatDate(note.modifiedAt)}</p>
      </div>
      <button onClick={onRestore} className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50">
        Restore
      </button>
      <button onClick={onDeleteForever} className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50">
        Delete
      </button>
    </div>
  );
}
