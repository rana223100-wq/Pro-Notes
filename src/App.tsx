import { useEffect, useState } from 'react';
import type { Note } from './types';
import { loadNotes, saveNotes } from './lib/storage';
import { uid } from './lib/utils';
import NotesList from './components/NotesList';
import NoteEditor from './components/NoteEditor';

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setNotes(loadNotes<Note>());
  }, []);

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  const openNote = notes.find((n) => n.id === openId) || null;

  const createNote = () => {
    const n: Note = {
      id: uid(),
      title: '',
      content: '',
      plain: '',
      category: 'Work',
      pinned: false,
      favorite: false,
      locked: false,
      inTrash: false,
      attachments: [],
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      font: 'Inter, sans-serif',
      pageColor: '#f8fafc',
      textColor: '#0f172a',
    };
    setNotes((prev) => [n, ...prev]);
    setOpenId(n.id);
  };

  const updateNote = (updated: Note) => {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  };

  const togglePin = (id: string) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
  const toggleFav = (id: string) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, favorite: !n.favorite } : n)));
  const trashNote = (id: string) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, inTrash: true } : n)));
  const restoreNote = (id: string) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, inTrash: false } : n)));
  const deleteForever = (id: string) =>
    setNotes((prev) => prev.filter((n) => n.id !== id));

  if (openNote) {
    return (
      <NoteEditor
        note={openNote}
        onChange={updateNote}
        onBack={() => setOpenId(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0">
      <NotesList
        notes={notes}
        onOpen={setOpenId}
        onNew={createNote}
        onTogglePin={togglePin}
        onToggleFav={toggleFav}
        onTrash={trashNote}
        onRestore={restoreNote}
        onDeleteForever={deleteForever}
      />
    </div>
  );
}
