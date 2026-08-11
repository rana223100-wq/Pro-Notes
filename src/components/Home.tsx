import { useMemo, useState } from 'react';
import {
  Search, Plus, MoreVertical, Layers, Pin, Star, Lock, Trash2, Palette, User, X,
} from 'lucide-react';
import type { Category, Filter, ThemePref } from '@/types';
import { useNotes } from '@/store/NotesContext';
import { useTheme } from '@/hooks/useTheme';
import { LogoWordmark } from '@/components/Logo';
import { NoteCard } from '@/components/NoteCard';
import { Sheet } from '@/components/Sheet';
import { PasswordSheet } from '@/components/PasswordSheet';

const CATEGORIES: Category[] = ['All', 'Work', 'Personal', 'Important', 'Checklist'];
const FILTERS: { key: Filter; label: string; icon: React.ReactNode }[] = [
  { key: 'All', label: 'All', icon: <Layers size={18} /> },
  { key: 'Pin', label: 'Pin', icon: <Pin size={18} /> },
  { key: 'Favorites', label: 'Favorites', icon: <Star size={18} /> },
  { key: 'Lock', label: 'Lock', icon: <Lock size={18} /> },
  { key: 'Trash', label: 'Trash', icon: <Trash2 size={18} /> },
];

interface HomeProps {
  onOpenNote: (id: string) => void;
  onOpenLockFolder: () => void;
  onOpenTrash: () => void;
  onOpenAccount: () => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  category: Category;
  setCategory: (c: Category) => void;
}

export function Home({
  onOpenNote,
  onOpenLockFolder,
  onOpenTrash,
  onOpenAccount,
  filter,
  setFilter,
  category,
  setCategory,
}: HomeProps) {
  const { notes, createNote, togglePin, toggleFavorite, deleteNote, setLocked, moveToLockFolder } = useNotes();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [noteMenuFor, setNoteMenuFor] = useState<string | null>(null);
  const [lockTarget, setLockTarget] = useState<{ id: string; mode: 'set' | 'remove'; pw?: string } | null>(null);

  const visibleNotes = useMemo(() => {
    let list = notes.filter((n) => !n.inTrash && !n.inLockFolder);
    if (filter === 'Pin') list = list.filter((n) => n.pinned);
    else if (filter === 'Favorites') list = list.filter((n) => n.favorite);
    if (category !== 'All') list = list.filter((n) => n.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.plain.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.modifiedAt - a.modifiedAt);
  }, [notes, filter, category, query]);

  const noteForMenu = notes.find((n) => n.id === noteMenuFor) ?? null;

  const handleNewNote = () => {
    const n = createNote();
    onOpenNote(n.id);
  };

  const handleFilter = (f: Filter) => {
    setMenuOpen(false);
    if (f === 'Lock') return onOpenLockFolder();
    if (f === 'Trash') return onOpenTrash();
    setFilter(f);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-app"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <LogoWordmark size={32} />
        <button onClick={() => setMenuOpen(true)} className="p-2 rounded-lg hover:bg-black/5 text-main" aria-label="options">
          <MoreVertical size={22} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full rounded-xl pl-10 pr-10 py-2.5 text-main outline-none border border-app surface-soft"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Categories bar */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition ${
              category === c ? 'text-white' : 'text-soft surface-soft border-app'
            }`}
            style={category === c ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
          >
            {c}
          </button>
        ))}
      </div>

      {filter !== 'All' && (
        <div className="px-4 pb-1">
          <span className="text-xs text-muted">
            Showing: <span className="accent-text font-medium">{filter}</span>
          </span>
        </div>
      )}

      {/* Notes area */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-1">
        {visibleNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="surface-soft rounded-2xl p-5 mb-3">
              <Plus size={32} className="text-muted" />
            </div>
            <p className="text-soft text-sm">
              {query ? 'No notes match your search.' : 'No notes yet. Tap + to create one.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {visibleNotes.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onOpen={() => onOpenNote(n.id)}
                onTogglePin={() => togglePin(n.id)}
                onToggleFavorite={() => toggleFavorite(n.id)}
                onMenu={() => setNoteMenuFor(n.id)}
                showLockBadge
              />
            ))}
          </div>
        )}
      </div>

      {/* Plus button */}
      <button
        onClick={handleNewNote}
        className="fixed bottom-6 right-6 z-30 flex items-center justify-center rounded-full text-white shadow-2xl transition hover:scale-105 active:scale-95"
        style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.5)' }}
        aria-label="New note"
      >
        <Plus size={26} />
      </button>

      {/* 3-dot main menu */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} side="bottom">
        <div className="p-2">
          <p className="px-4 pt-2 pb-1 text-xs uppercase tracking-wider text-muted">Filter</p>
          {FILTERS.map((f) => (
            <MenuItem
              key={f.key}
              label={f.label}
              icon={f.icon}
              active={filter === f.key}
              onClick={() => handleFilter(f.key)}
            />
          ))}
          <MenuDivider />
          <MenuItem label="Theme" icon={<Palette size={18} />} onClick={() => { setMenuOpen(false); setThemeOpen(true); }} />
          <MenuItem label="Account" icon={<User size={18} />} onClick={() => { setMenuOpen(false); onOpenAccount(); }} />
        </div>
      </Sheet>

      {/* Theme sheet */}
      <Sheet open={themeOpen} onClose={() => setThemeOpen(false)} title="Theme" side="bottom">
        <div className="p-3 space-y-2">
          {(['system', 'dark', 'light'] as ThemePref[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTheme(t); setThemeOpen(false); }}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border ${
                theme === t ? 'text-white' : 'surface-soft text-main border-app'
              }`}
              style={theme === t ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
            >
              <span className="font-medium capitalize">{t === 'system' ? 'Default system theme' : `${t} theme`}</span>
              {theme === t && <span>✓</span>}
            </button>
          ))}
        </div>
      </Sheet>

      {/* per-note menu */}
      {noteForMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setNoteMenuFor(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute z-10 surface rounded-xl shadow-2xl py-1 animate-pop-in"
            style={{ right: 16, top: '40%', minWidth: 240 }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem
              label={noteForMenu.pinned ? 'Unpin' : 'Pin'}
              icon={<Pin size={17} />}
              onClick={() => { togglePin(noteForMenu.id); setNoteMenuFor(null); }}
            />
            <MenuItem
              label={noteForMenu.favorite ? 'Remove from favorites' : 'Favorites'}
              icon={<Star size={17} />}
              onClick={() => { toggleFavorite(noteForMenu.id); setNoteMenuFor(null); }}
            />
            <MenuItem
              label={noteForMenu.locked ? 'Remove lock' : 'Lock'}
              icon={<Lock size={17} />}
              onClick={() => {
                const n = noteForMenu;
                setNoteMenuFor(null);
                setLockTarget({ id: n.id, mode: n.locked ? 'remove' : 'set', pw: n.lockPassword });
              }}
            />
            <MenuItem
              label="Move to lock"
              icon={<Lock size={17} />}
              onClick={() => { moveToLockFolder(noteForMenu.id); setNoteMenuFor(null); }}
            />
            <MenuItem
              label="Move to trash"
              icon={<Trash2 size={17} />}
              danger
              onClick={() => { deleteNote(noteForMenu.id); setNoteMenuFor(null); }}
            />
          </div>
        </div>
      )}

      {/* Note-level lock sheet */}
      <PasswordSheet
        open={lockTarget !== null}
        mode={lockTarget?.mode ?? 'set'}
        expectedPassword={lockTarget?.pw}
        onClose={() => setLockTarget(null)}
        onSuccess={(pw) => {
          if (!lockTarget) return;
          if (lockTarget.mode === 'set') setLocked(lockTarget.id, true, pw);
          else setLocked(lockTarget.id, false);
          setLockTarget(null);
        }}
      />
    </div>
  );
}

function MenuItem({
  label, icon, onClick, active, danger,
}: { label: string; icon: React.ReactNode; onClick: () => void; active?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-black/5 text-left"
      style={{ color: danger ? 'var(--danger)' : active ? 'var(--accent)' : 'var(--text)' }}
    >
      <span style={{ color: danger ? 'var(--danger)' : active ? 'var(--accent)' : 'var(--text-soft)' }}>{icon}</span>
      <span className="text-[15px] font-medium flex-1">{label}</span>
      {active && <span className="text-xs">●</span>}
    </button>
  );
}
function MenuDivider() {
  return <div className="h-px my-1 mx-2" style={{ background: 'var(--border)' }} />;
}
