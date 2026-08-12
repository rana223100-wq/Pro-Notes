import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft, Star, Pin, MoreVertical, Redo2, Undo2,
  Bold, Italic, Underline, List, ListOrdered,
  Image as ImageIcon, Film, File as FileIcon,
  Trash2, Maximize2, SendToBack, BringToFront,
} from 'lucide-react';
import type { Note, NoteAttachment } from '../types';
import { uid, readFileAsDataUrl } from '../lib/utils';
import FullscreenViewer from './FullscreenViewer';
import { openFileAttachment } from '../lib/openFile';

interface Props {
  note: Note;
  onChange: (note: Note) => void;
  onBack: () => void;
}

export default function NoteEditor({ note, onChange, onBack }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [fullscreen, setFullscreen] = useState<NoteAttachment | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const historyRef = useRef<string[]>([note.content]);
  const historyIdx = useRef(0);

  // Load content into editor on mount / note switch
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== note.content) {
      editorRef.current.innerHTML = note.content;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    pushHistory();
  };

  const pushHistory = () => {
    const html = editorRef.current?.innerHTML || '';
    if (html === historyRef.current[historyIdx.current]) return;
    historyRef.current = historyRef.current.slice(0, historyIdx.current + 1);
    historyRef.current.push(html);
    historyIdx.current = historyRef.current.length - 1;
    updateNote();
  };

  const undo = () => {
    if (historyIdx.current > 0) {
      historyIdx.current--;
      if (editorRef.current) editorRef.current.innerHTML = historyRef.current[historyIdx.current];
      updateNote();
    }
  };

  const redo = () => {
    if (historyIdx.current < historyRef.current.length - 1) {
      historyIdx.current++;
      if (editorRef.current) editorRef.current.innerHTML = historyRef.current[historyIdx.current];
      updateNote();
    }
  };

  const updateNote = useCallback(() => {
    const html = editorRef.current?.innerHTML || '';
    const plain = editorRef.current?.innerText || '';
    onChange({
      ...note,
      content: html,
      plain,
      modifiedAt: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const handleInput = () => {
    updateNote();
  };

  // ---- Attachments ----

  const addFiles = async (files: FileList | null, kind: 'image' | 'video' | 'file') => {
    if (!files) return;
    const newAtts: NoteAttachment[] = [];
    for (const file of Array.from(files)) {
      const dataUrl = await readFileAsDataUrl(file);
      newAtts.push({
        id: uid(),
        kind,
        name: file.name,
        dataUrl,
        mime: file.type || 'application/octet-stream',
        size: file.size,
      });
    }
    onChange({ ...note, attachments: [...note.attachments, ...newAtts], modifiedAt: Date.now() });
  };

  const removeAttachment = (id: string) => {
    onChange({
      ...note,
      attachments: note.attachments.filter((a) => a.id !== id),
      modifiedAt: Date.now(),
    });
  };

  const toggleZBehind = (id: string) => {
    onChange({
      ...note,
      attachments: note.attachments.map((a) =>
        a.id === id ? { ...a, zBehind: !a.zBehind } : a,
      ),
      modifiedAt: Date.now(),
    });
  };

  // Split attachments: behind-text layer vs. above-text layer
  const behind = note.attachments.filter((a) => a.zBehind);
  const above = note.attachments.filter((a) => !a.zBehind);

  const textStyle: React.CSSProperties = {
    fontFamily: note.font || 'Inter, sans-serif',
    color: note.textColor || '#0f172a',
  };

  return (
    <div className="fixed inset-0 flex flex-col app-bg" style={{ background: note.pageColor || '#f8fafc' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 surface border-b border-app shrink-0 z-30">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-main" title="Back">
          <ArrowLeft size={22} />
        </button>
        <input
          value={note.title}
          onChange={(e) => onChange({ ...note, title: e.target.value, modifiedAt: Date.now() })}
          placeholder="Title"
          className="flex-1 text-base font-semibold bg-transparent outline-none text-main min-w-0"
          style={textStyle}
        />
        <button
          onClick={() => onChange({ ...note, favorite: !note.favorite, modifiedAt: Date.now() })}
          className="p-2 rounded-lg hover:bg-slate-100"
          title="Favorite"
        >
          <Star size={20} className={note.favorite ? 'fill-amber-400 text-amber-400' : 'text-muted'} />
        </button>
        <button
          onClick={() => onChange({ ...note, pinned: !note.pinned, modifiedAt: Date.now() })}
          className="p-2 rounded-lg hover:bg-slate-100"
          title="Pin"
        >
          <Pin size={20} className={note.pinned ? 'fill-blue-500 text-blue-500' : 'text-muted'} />
        </button>
        <div className="relative">
          <button onClick={() => setShowMenu((v) => !v)} className="p-2 rounded-lg hover:bg-slate-100 text-main">
            <MoreVertical size={20} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 surface rounded-xl shadow-lg border border-app py-1 z-50 min-w-[160px]">
                <button
                  onClick={() => { onChange({ ...note, inTrash: true, modifiedAt: Date.now() }); onBack(); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={16} /> Move to Trash
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 surface border-b border-app shrink-0 overflow-x-auto z-20">
        <button onClick={undo} className="p-2 rounded-lg hover:bg-slate-100 text-main" title="Undo"><Undo2 size={18} /></button>
        <button onClick={redo} className="p-2 rounded-lg hover:bg-slate-100 text-main" title="Redo"><Redo2 size={18} /></button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button onClick={() => exec('bold')} className="p-2 rounded-lg hover:bg-slate-100 text-main" title="Bold"><Bold size={18} /></button>
        <button onClick={() => exec('italic')} className="p-2 rounded-lg hover:bg-slate-100 text-main" title="Italic"><Italic size={18} /></button>
        <button onClick={() => exec('underline')} className="p-2 rounded-lg hover:bg-slate-100 text-main" title="Underline"><Underline size={18} /></button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button onClick={() => exec('insertUnorderedList')} className="p-2 rounded-lg hover:bg-slate-100 text-main" title="Bullet list"><List size={18} /></button>
        <button onClick={() => exec('insertOrderedList')} className="p-2 rounded-lg hover:bg-slate-100 text-main" title="Numbered list"><ListOrdered size={18} /></button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button onClick={() => imageInputRef.current?.click()} className="p-2 rounded-lg hover:bg-slate-100 text-main" title="Add image"><ImageIcon size={18} /></button>
        <button onClick={() => videoInputRef.current?.click()} className="p-2 rounded-lg hover:bg-slate-100 text-main" title="Add video"><Film size={18} /></button>
        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-slate-100 text-main" title="Add file"><FileIcon size={18} /></button>
      </div>

      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files, 'image')} />
      <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files, 'video')} />
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files, 'file')} />

      {/* Editor area: layered behind-attachments -> text -> above-attachments */}
      <div className="flex-1 overflow-y-auto relative" style={{ background: note.pageColor || '#f8fafc' }}>
        {/* BEHIND layer: attachments sent to back — text renders ON TOP of these */}
        {behind.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-0">
            {behind.map((att) => (
              <BehindAttachment key={att.id} att={att} />
            ))}
          </div>
        )}

        {/* TEXT layer — always on top of behind-attachments */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={pushHistory}
          className="relative min-h-full px-5 py-4 outline-none z-10"
          style={{
            ...textStyle,
            lineHeight: 1.6,
            minHeight: '100%',
          }}
          data-placeholder="Start writing…"
        />

        {/* ABOVE layer: attachments that sit on top of text */}
        {above.length > 0 && (
          <div className="relative px-5 pb-6 pt-2 z-20">
            <div className="flex flex-wrap gap-3">
              {above.map((att) => (
                <AttachmentCard
                  key={att.id}
                  att={att}
                  onRemove={() => removeAttachment(att.id)}
                  onFullscreen={() => setFullscreen(att)}
                  onSendBack={() => toggleZBehind(att.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {fullscreen && (
        <FullscreenViewer attachment={fullscreen} onClose={() => setFullscreen(null)} />
      )}
    </div>
  );
}

/** A behind-text attachment rendered as a positioned background image/video. */
function BehindAttachment({ att }: { att: NoteAttachment }) {
  if (att.kind === 'image') {
    return (
      <img
        src={att.dataUrl}
        alt={att.name}
        className="absolute max-w-full max-h-full object-contain opacity-90"
        style={{
          left: att.x ?? '50%',
          top: att.y ?? '50%',
          transform: 'translate(-50%, -50%)',
        }}
        draggable={false}
      />
    );
  }
  if (att.kind === 'video') {
    return (
      <video
        src={att.dataUrl}
        className="absolute max-w-full max-h-full object-contain opacity-90"
        style={{
          left: att.x ?? '50%',
          top: att.y ?? '50%',
          transform: 'translate(-50%, -50%)',
        }}
        controls
        muted
        loop
      />
    );
  }
  // files behind text show a faint label
  return (
    <div
      className="absolute surface-soft rounded-xl px-3 py-2 text-xs text-muted border border-app opacity-80"
      style={{ left: att.x ?? 16, top: att.y ?? 16 }}
    >
      <FileIcon size={14} className="inline mr-1" />
      {att.name}
    </div>
  );
}

/** An above-text attachment card with toolbar. */
function AttachmentCard({
  att,
  onRemove,
  onFullscreen,
  onSendBack,
}: {
  att: NoteAttachment;
  onRemove: () => void;
  onFullscreen: () => void;
  onSendBack: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="relative group rounded-xl overflow-hidden border border-app surface shrink-0"
      style={{ width: att.kind === 'image' ? 180 : 'auto' }}
    >
      {/* Preview */}
      <div
        className="cursor-pointer"
        onClick={() => {
          if (att.kind === 'file') openFileAttachment(att.name, att.dataUrl);
          else onFullscreen();
        }}
        onDoubleClick={() => att.kind === 'file' && onFullscreen()}
      >
        {att.kind === 'image' && (
          <img src={att.dataUrl} alt={att.name} className="w-full h-32 object-cover" />
        )}
        {att.kind === 'video' && (
          <video src={att.dataUrl} className="w-full h-32 object-cover" muted />
        )}
        {att.kind === 'file' && (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <FileIcon size={20} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-main truncate">{att.name}</p>
              <p className="text-xs text-muted">{att.mime.split('/')[1]?.toUpperCase() || 'FILE'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action toolbar */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-t border-app surface-soft">
        <button
          onClick={onFullscreen}
          className="p-1.5 rounded-md hover:bg-slate-200 text-main"
          title={att.kind === 'file' ? 'Open with…' : 'Full view'}
        >
          {att.kind === 'file' ? <SendToBack size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          onClick={onSendBack}
          className="p-1.5 rounded-md hover:bg-slate-200 text-main"
          title={att.zBehind ? 'Bring to front' : 'Send to back (write over it)'}
        >
          {att.zBehind ? <BringToFront size={14} /> : <SendToBack size={14} />}
        </button>
        <div className="flex-1" />
        <button
          onClick={onRemove}
          className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
