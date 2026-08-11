import { useState } from 'react';
import { ArrowLeft, Trash2, MoreVertical, RotateCcw, Check } from 'lucide-react';
import { NoteCard } from '@/components/NoteCard';
import { Sheet, Confirm } from '@/components/Sheet';
import { useNotes } from '@/store/NotesContext';

interface TrashProps {
  onBack: () => void;
  onOpenNote: (id: string) => void;
}

export function Trash({ onBack, onOpenNote }: TrashProps) {
  const { notes, togglePin, toggleFavorite, permanentDelete, restoreNote, deleteNote } = useNotes();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [askDelete, setAskDelete] = useState(false); // shows cancel/permanent-delete step
  const [confirmPurge, setConfirmPurge] = useState(false); // shows yes/no final
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const trashNotes = notes.filter((n) => n.inTrash);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelecting(false);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      <div
        className="flex items-center gap-2 px-3 py-3 border-b border-app"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <Trash2 size={20} style={{ color: 'var(--text-soft)' }} />
        <span className="text-main font-bold text-lg">Trash</span>
        <div className="flex-1" />
        {selecting && <span className="text-main text-sm font-medium mr-2">{selected.size} selected</span>}
        <button
          onClick={() => {
            setSelecting((s) => !s);
            setSelected(new Set());
          }}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-main surface-soft border border-app"
        >
          {selecting ? 'Done' : 'Select'}
        </button>
        {selecting && selected.size > 0 && (
          <button
            onClick={() => setAskDelete(true)}
            className="p-2 rounded-lg text-white"
            style={{ background: 'var(--danger)' }}
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        )}
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-black/5 text-main">
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {trashNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Trash2 size={40} className="text-muted mb-3" />
            <p className="text-soft text-sm">Trash is empty.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {trashNotes.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                selecting={selecting}
                selected={selected.has(n.id)}
                onToggleSelect={() => toggleSelect(n.id)}
                onOpen={() => onOpenNote(n.id)}
                onTogglePin={() => togglePin(n.id)}
                onToggleFavorite={() => toggleFavorite(n.id)}
                onMenu={() => setMenuFor(n.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Step 1: cancel / permanent delete */}
      <Sheet open={askDelete} onClose={() => setAskDelete(false)} side="center">
        <div className="p-5">
          <p className="text-center text-main text-[15px] mb-5">
            {selected.size} note(s) selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setAskDelete(false)}
              className="flex-1 rounded-xl px-4 py-2.5 font-medium surface-soft text-main border border-app"
            >
              Cancel
            </button>
            <button
              onClick={() => { setAskDelete(false); setConfirmPurge(true); }}
              className="flex-1 rounded-xl px-4 py-2.5 font-medium text-white"
              style={{ background: 'var(--danger)' }}
            >
              Permanent delete
            </button>
          </div>
        </div>
      </Sheet>

      {/* Step 2: are you sure */}
      <Confirm
        open={confirmPurge}
        message="Are you sure to permanently delete notes?"
        confirmLabel="Yes"
        cancelLabel="No"
        onCancel={() => setConfirmPurge(false)}
        onConfirm={() => {
          permanentDelete([...selected]);
          setSelected(new Set());
          setSelecting(false);
          setConfirmPurge(false);
        }}
      />

      {/* per-note menu */}
      {menuFor && (
        <div className="fixed inset-0 z-50" onClick={() => setMenuFor(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute z-10 surface rounded-xl shadow-2xl py-1 animate-pop-in"
            style={{ right: 16, top: '50%', transform: 'translateY(-50%)', minWidth: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { restoreNote(menuFor); setMenuFor(null); }}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-black/5 text-main text-left"
            >
              <RotateCcw size={17} /> Move out from trash
            </button>
            <button
              onClick={() => {
                permanentDelete([menuFor]);
                setMenuFor(null);
              }}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-black/5 text-left"
              style={{ color: 'var(--danger)' }}
            >
              <Trash2 size={17} /> Permanent delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
