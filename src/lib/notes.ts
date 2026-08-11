import type { Note, NoteAttachment } from '@/types';

export function wordsInHtml(html: string): number {
  const text = htmlToPlain(html).trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function charsInHtml(html: string): number {
  return htmlToPlain(html).length;
}

export function htmlToPlain(html: string): string {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  }
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent || el.innerText || '';
}

export function newNote(): Note {
  const now = Date.now();
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    title: '',
    content: '',
    plain: '',
    category: 'Personal',
    pinned: false,
    favorite: false,
    locked: false,
    inLockFolder: false,
    inTrash: false,
    attachments: [],
    createdAt: now,
    modifiedAt: now,
    font: 'var(--font-sans)',
    pageColor: '',
    textColor: '',
  };
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' });
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function makeAttachment(file: File, dataUrl: string): NoteAttachment {
  const kind: NoteAttachment['kind'] = file.type.startsWith('image/')
    ? 'image'
    : file.type.startsWith('video/')
      ? 'video'
      : 'file';
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    kind,
    name: file.name,
    dataUrl,
    mime: file.type,
    size: file.size,
    width: kind === 'file' ? undefined : 280,
    zBehind: false,
    x: 0,
    y: 0,
  };
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(first: string, last: string): string {
  return (first[0] || '').toUpperCase() + (last[0] || '').toUpperCase();
}

export function recomputeFromContent(note: Note): Note {
  return {
    ...note,
    plain: htmlToPlain(note.content),
    modifiedAt: Date.now(),
  };
}
