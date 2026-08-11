
/* AUTO-SAVE ENHANCED V3 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Star, Pin, MoveVertical as MoreVertical, Redo2, Undo2, Bold, Italic, Underline, Palette, Type as TypeIcon, List, ListOrdered, Image as ImageIcon, Film, File as FileIcon, Trash2, Copy, Share2, ChartBar as BarChart3, Lock as LockIcon, FolderLock, Minus, Plus, Move, Maximize2, Eye, EyeOff } from 'lucide-react';

import { App } from '@capacitor/app';

import { openFileAttachment } from '@/lib/openFile';

import type { Note, Category, NoteAttachment } from '@/types';

import {
  wordsInHtml,
  charsInHtml,
  htmlToPlain,
  formatDate,
  formatTime,
  makeAttachment,
 fileToDataUrl,
  formatBytes,
} from '@/lib/notes';

import { Sheet, Confirm } from '@/components/Sheet';
import { PasswordSheet } from '@/components/PasswordSheet';

const CATEGORIES: Exclude<Category, 'All'>[] = [
  'Work',
  'Personal',
  'Important',
  'Checklist',
];

const FONTS = [
  {
    label: 'Sans',
    value: 'Inter, ui-sans-serif, system-ui, sans-serif',
  },
  {
    label: 'Serif',
    value: 'Georgia, Times New Roman, serif',
  },
  {
    label: 'Mono',
    value: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  {
    label: 'Cursive',
    value: 'Brush Script MT, cursive',
  },
];

const PAGE_COLORS = [
  '#ffffff',
  '#fffbeb',
  '#ecfdf5',
  '#eff6ff',
  '#fdf2f8',
  '#f5f3ff',
  '#fef3c7',
  '#fee2e2',
  '#1a1a1a',
  '#0f172a',
  '#1e293b',
  '#3b3b3b',
];

const TEXT_COLORS = [
  '#0f172a',
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#ea580c',
  '#475569',
  '#ffffff',
];

interface EditorProps {
  note: Note;
  onBack: () => void;
  onSaveContent: (id: string, title: string, content: string) => void;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onMoveToLockFolder: (id: string) => void;
}

type AttachmentWithPosition = NoteAttachment & {
  x?: number;
  y?: number;
  zBehind?: boolean;
  width?: number;
};

export function NoteEditor({
  note,
  onBack,
  onSaveContent,
  onUpdate,
  onDelete,
  onMoveToLockFolder,
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const saveTimeoutRef = useRef<number | null>(null);

  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const lastHtmlRef = useRef('');
  const suspendHistoryRef = useRef(false);

  // Latest refs for cleanup saving
  const latestTitleRef = useRef(note.title);
  const latestContentRef = useRef(note.content);
  const latestNoteIdRef = useRef(note.id);

  // Refs so the back-button listener always calls the latest handler
  const handleBackRef = useRef<() => void>(() => {});
  const saveCurrentRef = useRef<() => void>(() => {});

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState(note.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [lockSheet, setLockSheet] =
    useState<null | 'set' | 'enter' | 'remove'>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const [activeAttachment, setActiveAttachment] =
    useState<AttachmentWithPosition | null>(null);

  const [movingAttachmentId, setMovingAttachmentId] = useState<string | null>(
    null,
  );

  const [toast, setToast] = useState('');

  const [fullscreenAttachment, setFullscreenAttachment] =
    useState<AttachmentWithPosition | null>(null);

  const [activeFmt, setActiveFmt] = useState({
    bold: false,
    italic: false,
    underline: false,
    ul: false,
    ol: false,
  });

  const fileImageRef = useRef<HTMLInputElement | null>(null);
  const fileVideoRef = useRef<HTMLInputElement | null>(null);
  const fileAnyRef = useRef<HTMLInputElement | null>(null);

  /*
   * ------------------------------------------------------------
   * LOAD NOTE CONTENT
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (
      editorRef.current &&
      editorRef.current.innerHTML !== note.content
    ) {
      editorRef.current.innerHTML = note.content;

      undoStackRef.current = [note.content];
      redoStackRef.current = [];
      lastHtmlRef.current = note.content;

      setCanUndo(false);
      setCanRedo(false);
    }

    setTitle(note.title);
    latestNoteIdRef.current = note.id;
    latestTitleRef.current = note.title;
    latestContentRef.current = note.content;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  /*
   * ------------------------------------------------------------
   * SYSTEM BACK BUTTON & APP STATE
   * ------------------------------------------------------------
   */

  useEffect(() => {
    const backHandler = App.addListener('backButton', () => {
      handleBackRef.current();
    });

    const stateHandler = App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        saveCurrentRef.current();
      }
    });

    return () => {
      // Final save on unmount using captured latest values
      onSaveContent(latestNoteIdRef.current, latestTitleRef.current, latestContentRef.current);

      backHandler.then((h) => h.remove());
      stateHandler.then((h) => h.remove());

      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [onSaveContent]);

  /*
   * ------------------------------------------------------------
   * HISTORY / UNDO / REDO
   * ------------------------------------------------------------
   */

  const pushHistory = useCallback(() => {
    if (suspendHistoryRef.current) return;

    const el = editorRef.current;
    if (!el) return;

    const html = el.innerHTML;

    if (html === lastHtmlRef.current) return;

    undoStackRef.current.push(lastHtmlRef.current);

    if (undoStackRef.current.length > 500) {
      undoStackRef.current.shift();
    }

    lastHtmlRef.current = html;
    redoStackRef.current = [];

    setCanUndo(undoStackRef.current.length > 1);
    setCanRedo(false);
  }, []);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();

    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);

    if (
      editorRef.current &&
      editorRef.current.contains(range.commonAncestorContainer)
    ) {
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const range = savedRangeRef.current;

    if (range) {
      const sel = window.getSelection();

      sel?.removeAllRanges();
      sel?.addRange(range);
    } else {
      editorRef.current?.focus();
    }
  }, []);

  const saveCurrent = useCallback(() => {
    // SYNC FROM DOM FIRST
    const content = editorRef.current?.innerHTML || '';
    const t = latestTitleRef.current;
    const id = latestNoteIdRef.current;

    latestContentRef.current = content;

    setIsSaving(true);
    onSaveContent(id, t, content);

    setTimeout(() => setIsSaving(false), 500);
  }, [onSaveContent]);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveCurrent();
    }, 500);
  }, [saveCurrent]);

  saveCurrentRef.current = saveCurrent;

  const onEditorInput = useCallback(() => {
    const html = editorRef.current?.innerHTML || '';
    latestContentRef.current = html;
    saveSelection();
    pushHistory();
    debouncedSave();
  }, [saveSelection, pushHistory, debouncedSave]);

  const handleBack = useCallback(() => {
    // SYNC LATEST
    const content = editorRef.current?.innerHTML || '';
    latestContentRef.current = content;
    const t = latestTitleRef.current;

    // FORCE SAVE
    onSaveContent(note.id, t, content);

    const plain = htmlToPlain(content).trim();

    // EMPTY CHECK using refs
    if (!t.trim() && !plain) {
      onDelete(note.id);
    }

    onBack();
  }, [onSaveContent, note.id, onDelete, onBack]);

  handleBackRef.current = handleBack;

  const undo = useCallback(() => {
    const stack = undoStackRef.current;

    if (stack.length <= 1) return;

    const el = editorRef.current;

    if (!el) return;

    const current = el.innerHTML;

    redoStackRef.current.push(current);

    const previous = stack.pop();

    if (previous === undefined) return;

    suspendHistoryRef.current = true;

    el.innerHTML = previous;

    lastHtmlRef.current = previous;

    suspendHistoryRef.current = false;

    setCanUndo(stack.length > 1);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;

    if (stack.length === 0) return;

    const el = editorRef.current;

    if (!el) return;

    const current = el.innerHTML;

    undoStackRef.current.push(current);

    const next = stack.pop();

    if (next === undefined) return;

    suspendHistoryRef.current = true;

    el.innerHTML = next;

    lastHtmlRef.current = next;

    suspendHistoryRef.current = false;

    setCanUndo(true);
    setCanRedo(stack.length > 0);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = editorRef.current;

      if (!el || document.activeElement !== el) return;

      const mod = e.ctrlKey || e.metaKey;

      if (!mod) return;

      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.key.toLowerCase() === 'z' && e.shiftKey) ||
        e.key.toLowerCase() === 'y'
      ) {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handler);

    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [undo, redo]);

  /*
   * ------------------------------------------------------------
   * FORMATTING STATE
   * ------------------------------------------------------------
   */

  useEffect(() => {
    const handler = () => {
      const el = editorRef.current;

      if (
        el &&
        (document.activeElement === el ||
          el.contains(document.activeElement))
      ) {
        try {
          setActiveFmt({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            ul: document.queryCommandState('insertUnorderedList'),
            ol: document.queryCommandState('insertOrderedList'),
          });
        } catch {
          // ignore
        }
      }
    };

    document.addEventListener('selectionchange', handler);

    return () => {
      document.removeEventListener('selectionchange', handler);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);

    window.setTimeout(() => {
      setToast('');
    }, 1800);
  }, []);

  /*
   * ------------------------------------------------------------
   * RICH TEXT COMMAND
   * ------------------------------------------------------------
   */

  const exec = useCallback(
    (command: string, value?: string) => {
      restoreSelection();

      document.execCommand(command, false, value);

      editorRef.current?.focus();

      const html = editorRef.current?.innerHTML || '';
      latestContentRef.current = html;

      pushHistory();
      saveCurrent();

      try {
        setActiveFmt({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          ul: document.queryCommandState('insertUnorderedList'),
          ol: document.queryCommandState('insertOrderedList'),
        });
      } catch {
        // ignore
      }
    },
    [restoreSelection, pushHistory, saveCurrent],
  );

  /*
   * ------------------------------------------------------------
   * ATTACHMENTS
   * ------------------------------------------------------------
   */

  const addAttachment = async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);

      const raw = makeAttachment(file, dataUrl) as AttachmentWithPosition;

      const att: AttachmentWithPosition = {
        ...raw,
        x: 0,
        y: 0,
        width: raw.width || 280,
        zBehind: false,
      };

      onUpdate(note.id, {
        attachments: [...note.attachments, att],
      });

      setActiveAttachment(att);

      showToast(`${att.kind} added`);
    } catch {
      showToast('Could not add attachment');
    }
  };

  const removeAttachment = (id: string) => {
    onUpdate(note.id, {
      attachments: note.attachments.filter((a) => a.id !== id),
    });

    setActiveAttachment(null);
    setMovingAttachmentId(null);

    showToast('Attachment deleted');
  };

  const getAttachment = useCallback(
    (id: string) => {
      return note.attachments.find(
        (a) => a.id === id,
      ) as AttachmentWithPosition | undefined;
    },
    [note.attachments],
  );

  const updateAttachment = useCallback(
    (id: string, patch: Partial<AttachmentWithPosition>) => {
      onUpdate(note.id, {
        attachments: note.attachments.map((a) =>
          a.id === id
            ? ({
                ...a,
                ...patch,
              } as NoteAttachment)
            : a,
        ),
      });

      setActiveAttachment((current) =>
        current && current.id === id
          ? ({
              ...current,
              ...patch,
            } as AttachmentWithPosition)
          : current,
      );
    },
    [note.id, note.attachments, onUpdate],
  );

  /*
   * ------------------------------------------------------------
   * ATTACHMENT MOVE
   * ------------------------------------------------------------
   */

  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
  } | null>(null);

  const startAttachmentMove = (
    e: React.PointerEvent,
    att: AttachmentWithPosition,
  ) => {
    if (!movingAttachmentId || movingAttachmentId !== att.id) return;

    e.preventDefault();
    e.stopPropagation();

    const originalX = att.x || 0;
    const originalY = att.y || 0;

    dragRef.current = {
      id: att.id,
      startX: e.clientX,
      startY: e.clientY,
      originalX,
      originalY,
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const moveAttachment = (e: React.PointerEvent) => {
    const drag = dragRef.current;

    if (!drag) return;

    e.preventDefault();

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    updateAttachment(drag.id, {
      x: drag.originalX + dx,
      y: drag.originalY + dy,
    });
  };

  const stopAttachmentMove = () => {
    dragRef.current = null;
  };

  /*
   * ------------------------------------------------------------
   * COPY / SHARE
   * ------------------------------------------------------------
   */

  const handleCopy = async () => {
    const text = htmlToPlain(
      editorRef.current?.innerHTML || '',
    );

    try {
      await navigator.clipboard.writeText(
        `${title}\n\n${text}`,
      );

      showToast('Copied to clipboard');
    } catch {
      showToast('Copy failed');
    }

    setMenuOpen(false);
  };

  const handleShare = async () => {
    const text = htmlToPlain(
      editorRef.current?.innerHTML || '',
    );
    const fullText = `${title || 'Pro Note'}\n\n${text}`;
    const shareData: ShareData = {
      title: title || 'Pro Note',
      text: fullText,
    };

    const fallbackCopy = async () => {
      try {
        await navigator.clipboard.writeText(fullText);
        showToast('Copied to clipboard');
      } catch {
        showToast('Could not share or copy');
      }
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showToast('Note shared');
      } else {
        await fallbackCopy();
      }
    } catch (err) {
      const name = (err as Error)?.name;
      if (name === 'AbortError') return;
      await fallbackCopy();
    }

    setMenuOpen(false);
  };

  /*
   * ------------------------------------------------------------
   * STATS
   * ------------------------------------------------------------
   */

  const stats = {
    chars: charsInHtml(
      editorRef.current?.innerHTML || note.content,
    ),
    words: wordsInHtml(
      editorRef.current?.innerHTML || note.content,
    ),
    images: note.attachments.filter(
      (a) => a.kind === 'image',
    ).length,
    videos: note.attachments.filter(
      (a) => a.kind === 'video',
    ).length,
    files: note.attachments.filter(
      (a) => a.kind === 'file',
    ).length,
  };

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg)' }}
    >
      {/* TOP BAR */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b border-app"
        style={{
          background: 'var(--bg-elevated)',
        }}
      >
        <button
          onClick={handleBack}
          className="p-2 rounded-lg hover:bg-black/5 text-main"
          title="Back"
          type="button"
        >
          <ArrowLeft size={20} />
        </button>

        <button
          onClick={() => setCatOpen(true)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-main surface-soft border border-app"
          type="button"
        >
          {note.category}
        </button>

        <div className="flex-1 flex items-center justify-center pointer-events-none">
          {isSaving && (
            <span className="text-[10px] uppercase tracking-widest text-muted animate-pulse font-bold">
              Saving...
            </span>
          )}
        </div>

        <button
          onClick={() =>
            onUpdate(note.id, {
              favorite: !note.favorite,
            })
          }
          className="p-2 rounded-lg hover:bg-black/5"
          style={{
            color: note.favorite
              ? '#f59e0b'
              : 'var(--text-muted)',
          }}
          type="button"
        >
          <Star
            size={19}
            fill={
              note.favorite
                ? 'currentColor'
                : 'none'
            }
          />
        </button>

        <button
          onClick={() =>
            onUpdate(note.id, {
              pinned: !note.pinned,
            })
          }
          className="p-2 rounded-lg hover:bg-black/5"
          style={{
            color: note.pinned
              ? 'var(--accent)'
              : 'var(--text-muted)',
          }}
          type="button"
        >
          <Pin
            size={19}
            fill={
              note.pinned
                ? 'currentColor'
                : 'none'
            }
          />
        </button>

        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 rounded-lg hover:bg-black/5 text-main"
          type="button"
        >
          <MoreVertical size={20} />
        </button>
      </div>

      {/* FORMATTING TOOLBAR */}
      <div
        className="relative flex items-center gap-1 px-3 py-2 border-b border-app z-30 overflow-x-auto"
        style={{
          background: 'var(--bg-elevated)',
        }}
      >
        <ToolBtn
          onClick={undo}
          disabled={!canUndo}
          title="Undo"
        >
          <Undo2 size={17} />
        </ToolBtn>

        <ToolBtn
          onClick={redo}
          disabled={!canRedo}
          title="Redo"
        >
          <Redo2 size={17} />
        </ToolBtn>

        <Divider />

        <ToolBtn
          onClick={() => exec('bold')}
          active={activeFmt.bold}
          title="Bold"
        >
          <Bold size={17} />
        </ToolBtn>

        <ToolBtn
          onClick={() => exec('italic')}
          active={activeFmt.italic}
          title="Italic"
        >
          <Italic size={17} />
        </ToolBtn>

        <ToolBtn
          onClick={() => exec('underline')}
          active={activeFmt.underline}
          title="Underline"
        >
          <Underline size={17} />
        </ToolBtn>

        <Divider />

        <ColorPicker
          icon={<TypeIcon size={17} />}
          colors={TEXT_COLORS}
          onPick={(c) => exec('foreColor', c)}
          title="Text color"
        />

        <ColorPicker
          icon={<Palette size={17} />}
          colors={PAGE_COLORS}
          onPick={(c) =>
            onUpdate(note.id, {
              pageColor: c,
            })
          }
          title="Page color"
          currentColor={note.pageColor}
        />

        <FontPicker
          onPick={(f) => exec('fontName', f)}
        />

        <Divider />

        <ToolBtn
          onClick={() =>
            exec('insertUnorderedList')
          }
          active={activeFmt.ul}
          title="Bullet list"
        >
          <List size={17} />
        </ToolBtn>

        <ToolBtn
          onClick={() =>
            exec('insertOrderedList')
          }
          active={activeFmt.ol}
          title="Numbered list"
        >
          <ListOrdered size={17} />
        </ToolBtn>
      </div>

      {/* PAGE */}
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className="mx-auto max-w-3xl rounded-2xl p-5 min-h-full surface relative overflow-visible"
          style={{
            background:
              note.pageColor ||
              'var(--bg-elevated)',
            fontFamily: note.font,
            color:
              note.textColor ||
              'var(--text)',
          }}
        >
          {/* TITLE */}
          <textarea
            ref={titleRef}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              latestTitleRef.current = e.target.value;
              debouncedSave();
            }}
            onBlur={saveCurrent}
            placeholder="Title"
            rows={1}
            className="w-full text-2xl font-bold bg-transparent outline-none resize-none mb-3"
            style={{
              color: 'inherit',
            }}
          />

          {/* TEXT */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Start writing your note..."
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            onInput={onEditorInput}
            onBlur={saveCurrent}
            className="note-page min-h-[120px]"
            style={{
              color: 'inherit',
            }}
          />

          {/* ATTACHMENTS */}
          {note.attachments.length > 0 && (
            <div
              className="mt-5 space-y-3"
              style={{
                position: 'relative',
              }}
            >
              {note.attachments.map((a) => {
                const attachment =
                  a as AttachmentWithPosition;

                return (
                  <AttachmentView
                    key={attachment.id}
                    att={attachment}
                    selected={
                      activeAttachment?.id ===
                      attachment.id
                    }
                    moving={
                      movingAttachmentId ===
                      attachment.id
                    }
                    onSelect={() => {
                      setActiveAttachment(
                        attachment,
                      );
                    }}
                    onStartMove={(e) =>
                      startAttachmentMove(
                        e,
                        attachment,
                      )
                    }
                    onMove={moveAttachment}
                    onStopMove={
                      stopAttachmentMove
                    }
                    onOpenFile={() =>
                      openFileAttachment(
                        attachment.name,
                        attachment.dataUrl,
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3 DOT MENU */}
      <Sheet
        open={menuOpen}
        onClose={() =>
          setMenuOpen(false)
        }
        side="bottom"
      >
        <MenuList>
          <MenuItem
            icon={<ImageIcon size={18} />}
            label="Add image"
            onClick={() => {
              setMenuOpen(false);
              fileImageRef.current?.click();
            }}
          />

          <MenuItem
            icon={<Film size={18} />}
            label="Add video"
            onClick={() => {
              setMenuOpen(false);
              fileVideoRef.current?.click();
            }}
          />

          <MenuItem
            icon={<FileIcon size={18} />}
            label="Add file"
            onClick={() => {
              setMenuOpen(false);
              fileAnyRef.current?.click();
            }}
          />

          <MenuDivider />

          <MenuItem
            icon={<LockIcon size={18} />}
            label={
              note.locked
                ? 'Remove lock'
                : 'Lock note'
            }
            onClick={() => {
              setMenuOpen(false);
              setLockSheet(
                note.locked
                  ? 'remove'
                  : 'set',
              );
            }}
          />

          <MenuItem
            icon={<FolderLock size={18} />}
            label="Move to lock folder"
            onClick={() => {
              setMenuOpen(false);
              saveCurrent();
              onMoveToLockFolder(
                note.id,
              );
              onBack();
            }}
          />

          <MenuItem
            icon={<Copy size={18} />}
            label="Copy"
            onClick={handleCopy}
          />

          <MenuItem
            icon={<Share2 size={18} />}
            label="Share note"
            onClick={handleShare}
          />

          <MenuItem
            icon={<BarChart3 size={18} />}
            label="Statistics"
            onClick={() => {
              setMenuOpen(false);
              setStatsOpen(true);
            }}
          />

          <MenuDivider />

          <MenuItem
            icon={<Trash2 size={18} />}
            label="Delete"
            danger
            onClick={() => {
              setMenuOpen(false);
              setConfirmDelete(true);
            }}
          />
        </MenuList>
      </Sheet>

      {/* CATEGORY */}
      <Sheet
        open={catOpen}
        onClose={() =>
          setCatOpen(false)
        }
        title="Select category"
        side="bottom"
      >
        <div className="p-3 grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => {
                onUpdate(note.id, {
                  category: c,
                });

                setCatOpen(false);
              }}
              className={`rounded-xl px-4 py-3 font-medium border transition ${
                note.category === c
                  ? 'text-white'
                  : 'surface-soft text-main border-app'
              }`}
              style={
                note.category === c
                  ? {
                      background:
                        'var(--accent)',
                      borderColor:
                        'var(--accent)',
                    }
                  : {}
              }
              type="button"
            >
              {c}
            </button>
          ))}
        </div>
      </Sheet>

      {/* STATISTICS */}
      <Sheet
        open={statsOpen}
        onClose={() =>
          setStatsOpen(false)
        }
        title="Statistics"
        side="bottom"
      >
        <div className="p-4 grid grid-cols-2 gap-3">
          <Stat
            label="Characters"
            value={stats.chars}
          />

          <Stat
            label="Words"
            value={stats.words}
          />

          <Stat
            label="Images"
            value={stats.images}
          />

          <Stat
            label="Videos"
            value={stats.videos}
          />

          <Stat
            label="Files"
            value={stats.files}
          />

          <Stat
            label="Category"
            value={note.category}
            text
          />

          <Stat
            label="Created"
            value={`${formatDate(
              note.createdAt,
            )} ${formatTime(
              note.createdAt,
            )}`}
            text
          />

          <Stat
            label="Modified"
            value={`${formatDate(
              note.modifiedAt,
            )} ${formatTime(
              note.modifiedAt,
            )}`}
            text
          />
        </div>
      </Sheet>

      {/* LOCK */}
      <PasswordSheet
        open={lockSheet !== null}
        mode={lockSheet ?? 'set'}
        expectedPassword={
          note.lockPassword
        }
        onClose={() =>
          setLockSheet(null)
        }
        onSuccess={(pw) => {
          if (lockSheet === 'set') {
            onUpdate(note.id, {
              locked: true,
              lockPassword: pw,
            });

            showToast('Note locked');
          } else if (
            lockSheet === 'remove'
          ) {
            onUpdate(note.id, {
              locked: false,
              lockPassword:
                undefined,
            });

            showToast('Lock removed');
          }

          setLockSheet(null);
        }}
      />

      {/* ========================================================
          ATTACHMENT TOOLBAR
          Toolbar is positioned directly beside/below attachment.
         ======================================================== */}

      {activeAttachment && (
        <AttachmentToolbar
          att={activeAttachment}
          moving={
            movingAttachmentId ===
            activeAttachment.id
          }
          onMove={() => {
            setMovingAttachmentId(
              (current) =>
                current ===
                activeAttachment.id
                  ? null
                  : activeAttachment.id,
            );
          }}
          onZoomIn={() => {
            const width =
              activeAttachment.width ||
              280;

            updateAttachment(
              activeAttachment.id,
              {
                width: Math.min(
                  width + 40,
                  800,
                ),
              },
            );
          }}
          onZoomOut={() => {
            const width =
              activeAttachment.width ||
              280;

            updateAttachment(
              activeAttachment.id,
              {
                width: Math.max(
                  width - 40,
                  80,
                ),
              },
            );
          }}
          onToggleLayer={() => {
            updateAttachment(
              activeAttachment.id,
              {
                zBehind:
                  !activeAttachment.zBehind,
              },
            );

            showToast(
              activeAttachment.zBehind
                ? 'Attachment in front'
                : 'Attachment behind text',
            );
          }}
          onDelete={() =>
            removeAttachment(
              activeAttachment.id,
            )
          }
          onFullscreen={() => {
            if (
              activeAttachment.kind ===
                'image' ||
              activeAttachment.kind ===
                'video'
            ) {
              setFullscreenAttachment(
                activeAttachment,
              );
            } else {
              openFileAttachment(
                activeAttachment.name,
                activeAttachment.dataUrl,
              );
            }
          }}
          onClose={() => {
            setActiveAttachment(null);
            setMovingAttachmentId(null);
          }}
        />
      )}

      {/* CONFIRM DELETE NOTE */}
      <Confirm
        open={confirmDelete}
        message="Delete this note? It will move to Trash."
        confirmLabel="Delete"
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(note.id);
          onBack();
        }}
        onCancel={() =>
          setConfirmDelete(false)
        }
      />

      {/* HIDDEN FILE INPUTS */}
      <input
        ref={fileImageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f =
            e.target.files?.[0];

          if (f) addAttachment(f);

          e.target.value = '';
        }}
      />

      <input
        ref={fileVideoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f =
            e.target.files?.[0];

          if (f) addAttachment(f);

          e.target.value = '';
        }}
      />

      <input
        ref={fileAnyRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f =
            e.target.files?.[0];

          if (f) addAttachment(f);

          e.target.value = '';
        }}
      />

      {/* TOAST */}
      {toast && (
        <div
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-full text-white text-sm animate-pop-in"
          style={{
            background:
              'rgba(15,23,42,0.9)',
          }}
        >
          {toast}
        </div>
      )}

      {/* FULLSCREEN IMAGE / VIDEO */}
      {fullscreenAttachment && (
        <FullscreenAttachment
          att={fullscreenAttachment}
          onClose={() =>
            setFullscreenAttachment(
              null,
            )
          }
        />
      )}
    </div>
  );
}

/* ================================================================
   TOOL BUTTON
================================================================ */

function ToolBtn({
  children,
  onClick,
  active,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      onMouseDown={(e) =>
        e.preventDefault()
      }
      disabled={disabled}
      title={title}
      className={`p-2 rounded-lg hover:bg-black/5 shrink-0 transition-colors ${
        active ? 'bg-black/10' : ''
      } ${
        disabled
          ? 'opacity-30 cursor-not-allowed hover:bg-transparent'
          : ''
      }`}
      style={{
        color: active
          ? 'var(--accent)'
          : 'var(--text)',
      }}
      type="button"
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <span
      className="w-px h-5 mx-1 shrink-0"
      style={{
        background:
          'var(--border)',
      }}
    />
  );
}

/* ================================================================
   COLOR PICKER
================================================================ */

function ColorPicker({
  icon,
  colors,
  onPick,
  title,
  currentColor,
}: {
  icon: React.ReactNode;
  colors: string[];
  onPick: (c: string) => void;
  title: string;
  currentColor?: string;
}) {
  const [open, setOpen] =
    useState(false);

  const [custom, setCustom] =
    useState('#2563eb');

  const btnRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const [pos, setPos] = useState({
    top: 0,
    left: 0,
  });

  const toggle = () => {
    if (
      !open &&
      btnRef.current
    ) {
      const r =
        btnRef.current.getBoundingClientRect();

      const panelWidth = 240;

      let left = r.left;

      if (
        left + panelWidth >
        window.innerWidth - 8
      ) {
        left = Math.max(
          8,
          window.innerWidth -
            panelWidth -
            8,
        );
      }

      setPos({
        top: r.bottom + 6,
        left,
      });
    }

    setOpen((o) => !o);
  };

  const pick = (c: string) => {
    onPick(c);
    setOpen(false);
  };

  return (
    <button
      ref={btnRef}
      onClick={toggle}
      onMouseDown={(e) =>
        e.preventDefault()
      }
      className="p-2 rounded-lg hover:bg-black/5 text-main relative"
      title={title}
      type="button"
    >
      {icon}

      {currentColor && (
        <span
          className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white shadow-sm"
          style={{
            background:
              currentColor,
          }}
        />
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() =>
              setOpen(false)
            }
          />

          <div
            className="fixed z-50 p-3 rounded-2xl shadow-xl animate-pop-in border"
            style={{
              top: pos.top,
              left: pos.left,
              width: 240,
              background:
                'var(--bg-elevated)',
              borderColor:
                'var(--border)',
            }}
          >
            <div className="grid grid-cols-6 gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() =>
                    pick(c)
                  }
                  onMouseDown={(e) =>
                    e.preventDefault()
                  }
                  className="w-7 h-7 rounded-lg border hover:scale-110 transition-transform"
                  style={{
                    background: c,
                    borderColor:
                      'var(--border)',
                  }}
                  type="button"
                />
              ))}
            </div>

            <div
              className="h-px my-3"
              style={{
                background:
                  'var(--border)',
              }}
            />

            <div className="flex gap-2 items-center">
              <div className="relative w-9 h-9 shrink-0">
                <input
                  type="color"
                  value={custom}
                  onChange={(e) =>
                    setCustom(
                      e.target.value,
                    )
                  }
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />

                <span
                  className="block w-9 h-9 rounded-lg border"
                  style={{
                    background:
                      custom,
                    borderColor:
                      'var(--border)',
                  }}
                />
              </div>

              <input
                type="text"
                value={custom}
                onChange={(e) =>
                  setCustom(
                    e.target.value,
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter'
                  ) {
                    e.preventDefault();
                    pick(custom);
                  }
                }}
                onMouseDown={(e) =>
                  e.stopPropagation()
                }
                placeholder="#2563eb"
                className="flex-1 rounded-lg px-2 py-1.5 text-sm text-main outline-none border border-app surface-soft min-w-0"
              />

              <button
                onClick={() =>
                  pick(custom)
                }
                onMouseDown={(e) =>
                  e.preventDefault()
                }
                className="px-3 py-1.5 rounded-lg text-white text-sm font-medium shrink-0"
                style={{
                  background:
                    'var(--accent)',
                }}
                type="button"
              >
                OK
              </button>
            </div>
          </div>
        </>
      )}
    </button>
  );
}

/* ================================================================
   FONT PICKER
================================================================ */

function FontPicker({
  onPick,
}: {
  onPick: (f: string) => void;
}) {
  const [open, setOpen] =
    useState(false);

  const btnRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const [pos, setPos] = useState({
    top: 0,
    left: 0,
  });

  const toggle = () => {
    if (
      !open &&
      btnRef.current
    ) {
      const r =
        btnRef.current.getBoundingClientRect();

      setPos({
        top: r.bottom + 6,
        left: Math.max(
          8,
          r.left - 60,
        ),
      });
    }

    setOpen((o) => !o);
  };

  return (
    <button
      ref={btnRef}
      onClick={toggle}
      onMouseDown={(e) =>
        e.preventDefault()
      }
      className="p-2 rounded-lg hover:bg-black/5 text-main"
      title="Font"
      type="button"
    >
      <TypeIcon size={17} />

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() =>
              setOpen(false)
            }
          />

          <div
            className="fixed z-50 p-1.5 rounded-xl shadow-xl animate-pop-in border min-w-[140px]"
            style={{
              top: pos.top,
              left: pos.left,
              background:
                'var(--bg-elevated)',
              borderColor:
                'var(--border)',
            }}
          >
            {FONTS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  onPick(f.value);
                  setOpen(false);
                }}
                onMouseDown={(e) =>
                  e.preventDefault()
                }
                className="block w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 text-main text-sm"
                style={{
                  fontFamily:
                    f.value,
                }}
                type="button"
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}
    </button>
  );
}

/* ================================================================
   ATTACHMENT VIEW
================================================================ */

function AttachmentView({
  att,
  selected,
  moving,
  onSelect,
  onStartMove,
  onMove,
  onStopMove,
  onOpenFile,
}: {
  att: AttachmentWithPosition;
  selected: boolean;
  moving: boolean;
  onSelect: () => void;
  onStartMove: (
    e: React.PointerEvent,
  ) => void;
  onMove: (
    e: React.PointerEvent,
  ) => void;
  onStopMove: () => void;
  onOpenFile: () => void;
}) {
  const x = att.x || 0;
  const y = att.y || 0;

  const style: React.CSSProperties =
    {
      width:
        att.kind === 'file'
          ? undefined
          : att.width || 280,
      transform: `translate(${x}px, ${y}px)`,
      position: 'relative',
      zIndex: att.zBehind
        ? 0
        : selected
        ? 20
        : 2,
      touchAction: moving
        ? 'none'
        : 'auto',
      cursor: moving
        ? 'grabbing'
        : 'default',
    };

  if (att.kind === 'file') {
    return (
      <div
        className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl border border-app surface-soft cursor-pointer ${
          selected
            ? 'ring-2 ring-blue-500'
            : ''
        }`}
        style={style}
        onClick={onSelect}
        onDoubleClick={onOpenFile}
        onPointerDown={
          onStartMove
        }
        onPointerMove={onMove}
        onPointerUp={
          onStopMove
        }
        onPointerCancel={
          onStopMove
        }
      >
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{
            background:
              'var(--accent-soft)',
          }}
        >
          <FileIcon
            size={20}
            style={{
              color:
                'var(--accent)',
            }}
          />
        </div>

        <div className="min-w-0">
          <div className="font-medium text-main truncate max-w-[220px]">
            {att.name}
          </div>

          <div className="text-xs text-muted">
            {formatBytes(att.size)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-block select-none ${
        selected
          ? 'ring-2 ring-blue-500 rounded-xl'
          : ''
      }`}
      style={style}
      onClick={onSelect}
      onPointerDown={
        onStartMove
      }
      onPointerMove={onMove}
      onPointerUp={
        onStopMove
      }
      onPointerCancel={
        onStopMove
      }
    >
      {att.kind === 'image' ? (
        <img
          src={att.dataUrl}
          alt={att.name}
          draggable={false}
          className="rounded-xl border border-app block"
          style={{
            width:
              att.width || 280,
            pointerEvents:
              moving
                ? 'none'
                : 'auto',
          }}
        />
      ) : (
        <video
          src={att.dataUrl}
          controls
          className="rounded-xl border border-app block"
          style={{
            width:
              att.width || 280,
            pointerEvents:
              moving
                ? 'none'
                : 'auto',
          }}
        />
      )}

      {selected && (
        <div
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white"
          style={{
            pointerEvents:
              'none',
          }}
        />
      )}
    </div>
  );
}

/* ================================================================
   ATTACHMENT TOOLBAR
   IMPORTANT: This is positioned fixed near the selected attachment.
================================================================ */

function AttachmentToolbar({
  att,
  moving,
  onClose,
  onMove,
  onZoomIn,
  onZoomOut,
  onToggleLayer,
  onDelete,
  onFullscreen,
}: {
  att: AttachmentWithPosition;
  moving: boolean;
  onClose: () => void;
  onMove: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleLayer: () => void;
  onDelete: () => void;
  onFullscreen: () => void;
}) {
  const [position, setPosition] =
    useState({
      top: 0,
      left: 0,
    });

  /*
   * Find selected attachment visually.
   * Toolbar is kept immediately beside it.
   */
  useEffect(() => {
    const updatePosition = () => {
      const selected =
        document.querySelector(
          '[data-active-attachment="true"]',
        ) as HTMLElement | null;

      if (selected) {
        const rect =
          selected.getBoundingClientRect();

        const toolbarWidth = 310;

        let left =
          rect.left;

        if (
          left + toolbarWidth >
          window.innerWidth - 8
        ) {
          left =
            window.innerWidth -
            toolbarWidth -
            8;
        }

        left = Math.max(
          8,
          left,
        );

        let top =
          rect.bottom + 8;

        if (
          top + 60 >
          window.innerHeight
        ) {
          top =
            rect.top - 60;
        }

        setPosition({
          top: Math.max(
            8,
            top,
          ),
          left,
        });
      }
    };

    updatePosition();

    window.addEventListener(
      'resize',
      updatePosition,
    );

    window.addEventListener(
      'scroll',
      updatePosition,
      true,
    );

    const timer =
      window.setInterval(
        updatePosition,
        150,
      );

    return () => {
      window.removeEventListener(
        'resize',
        updatePosition,
      );

      window.removeEventListener(
        'scroll',
        updatePosition,
        true,
      );

      window.clearInterval(
        timer,
      );
    };
  }, [att.id]);

  return (
    <div
      className="fixed z-[60] flex items-center gap-1 px-2 py-1.5 rounded-2xl shadow-2xl border border-app"
      style={{
        background:
          'var(--bg-elevated)',
        top: position.top,
        left: position.left,
      }}
    >
      <button
        onClick={onMove}
        className={`p-2 rounded-lg hover:bg-black/5 ${
          moving
            ? 'bg-blue-500/10'
            : ''
        }`}
        style={{
          color: moving
            ? 'var(--accent)'
            : 'var(--text)',
        }}
        title={
          moving
            ? 'Stop moving'
            : 'Move attachment'
        }
        type="button"
      >
        <Move size={17} />
      </button>

      <button
        onClick={onZoomOut}
        className="p-2 rounded-lg hover:bg-black/5 text-main"
        title="Zoom out"
        type="button"
      >
        <Minus size={17} />
      </button>

      <button
        onClick={onZoomIn}
        className="p-2 rounded-lg hover:bg-black/5 text-main"
        title="Zoom in"
        type="button"
      >
        <Plus size={17} />
      </button>

      <span
        className="w-px h-5"
        style={{
          background:
            'var(--border)',
        }}
      />

      <button
        onClick={onToggleLayer}
        className="p-2 rounded-lg hover:bg-black/5 text-main"
        title={
          att.zBehind
            ? 'Bring to front'
            : 'Behind text'
        }
        type="button"
      >
        {att.zBehind ? (
          <EyeOff size={17} />
        ) : (
          <Eye size={17} />
        )}
      </button>

      <button
        onClick={onFullscreen}
        className="p-2 rounded-lg hover:bg-black/5 text-main"
        title={
          att.kind === 'file'
            ? 'Open file'
            : 'Fullscreen'
        }
        type="button"
      >
        {att.kind === 'file' ? (
          <Share2 size={17} />
        ) : (
          <Maximize2 size={17} />
        )}
      </button>

      <span
        className="w-px h-5"
        style={{
          background:
            'var(--border)',
        }}
      />

      <button
        onClick={onDelete}
        className="p-2 rounded-lg hover:bg-black/5"
        style={{
          color:
            'var(--danger)',
        }}
        title="Delete attachment"
        type="button"
      >
        <Trash2 size={17} />
      </button>

      <button
        onClick={onClose}
        className="px-2 py-1 rounded-lg text-xs text-muted hover:bg-black/5"
        title="Close toolbar"
        type="button"
      >
        ×
      </button>
    </div>
  );
}

/* ================================================================
   FULLSCREEN ATTACHMENT
   Supports:
   - pinch zoom
   - pan
   - video controls
   - original dataUrl
================================================================ */

function FullscreenAttachment({
  att,
  onClose,
}: {
  att: AttachmentWithPosition;
  onClose: () => void;
}) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [scale, setScale] =
    useState(1);

  const [offset, setOffset] =
    useState({
      x: 0,
      y: 0,
    });

  const pointers =
    useRef<
      Map<
        number,
        { x: number; y: number }
      >
    >(new Map());

  const pinchStartDistance =
    useRef<number | null>(null);

  const pinchStartScale =
    useRef(1);

  const panStart =
    useRef<{
      x: number;
      y: number;
      ox: number;
      oy: number;
    } | null>(null);

  const getDistance = (
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => {
    return Math.sqrt(
      Math.pow(a.x - b.x, 2) +
        Math.pow(a.y - b.y, 2),
    );
  };

  const clampScale = (
    value: number,
  ) => {
    return Math.min(
      5,
      Math.max(
        0.5,
        value,
      ),
    );
  };

  const onPointerDown = (
    e: React.PointerEvent,
  ) => {
    e.preventDefault();

    pointers.current.set(
      e.pointerId,
      {
        x: e.clientX,
        y: e.clientY,
      },
    );

    if (
      pointers.current.size === 2
    ) {
      const values = Array.from(
        pointers.current.values(),
      );

      pinchStartDistance.current =
        getDistance(
          values[0],
          values[1],
        );

      pinchStartScale.current =
        scale;

      panStart.current = null;
    } else if (
      pointers.current.size === 1
    ) {
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        ox: offset.x,
        oy: offset.y,
      };
    }

    try {
      (
        e.currentTarget as HTMLElement
      ).setPointerCapture(
        e.pointerId,
      );
    } catch {
      // ignore
    }
  };

  const onPointerMove = (
    e: React.PointerEvent,
  ) => {
    if (
      !pointers.current.has(
        e.pointerId,
      )
    ) {
      return;
    }

    e.preventDefault();

    pointers.current.set(
      e.pointerId,
      {
        x: e.clientX,
        y: e.clientY,
      },
    );

    if (
      pointers.current.size === 2 &&
      pinchStartDistance.current
    ) {
      const values = Array.from(
        pointers.current.values(),
      );

      const distance =
        getDistance(
          values[0],
          values[1],
        );

      const ratio =
        distance /
        pinchStartDistance.current;

      setScale(
        clampScale(
          pinchStartScale.current *
            ratio,
        ),
      );

      return;
    }

    if (
      pointers.current.size === 1 &&
      panStart.current
    ) {
      const dx =
        e.clientX -
        panStart.current.x;

      const dy =
        e.clientY -
        panStart.current.y;

      setOffset({
        x:
          panStart.current.ox +
          dx,
        y:
          panStart.current.oy +
          dy,
      });
    }
  };

  const onPointerUp = (
    e: React.PointerEvent,
  ) => {
    pointers.current.delete(
      e.pointerId,
    );

    if (
      pointers.current.size < 2
    ) {
      pinchStartDistance.current =
        null;
    }

    if (
      pointers.current.size === 0
    ) {
      panStart.current = null;
    }
  };

  const resetView = () => {
    setScale(1);
    setOffset({
      x: 0,
      y: 0,
    });
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center overflow-hidden"
      onPointerDown={
        onPointerDown
      }
      onPointerMove={
        onPointerMove
      }
      onPointerUp={
        onPointerUp
      }
      onPointerCancel={
        onPointerUp
      }
      style={{
        touchAction:
          'none',
      }}
    >
      {/* CLOSE */}
      <button
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 z-20 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center text-2xl backdrop-blur active:scale-90 transition-transform"
        type="button"
      >
        ×
      </button>

      {/* RESET */}
      <button
        onClick={resetView}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-4 left-4 z-20 px-4 py-2 rounded-full bg-white/15 text-white text-sm backdrop-blur active:scale-90 transition-transform"
        type="button"
      >
        Reset
      </button>

      <div
        className="max-w-full max-h-full flex items-center justify-center"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin:
            'center center',
        }}
      >
        {att.kind === 'image' ? (
          <img
            src={att.dataUrl}
            alt={att.name}
            draggable={false}
            className="max-w-[100vw] max-h-[100vh] object-contain select-none"
            style={{
              userSelect:
                'none',
              WebkitUserSelect:
                'none',
            }}
          />
        ) : (
          <video
            src={att.dataUrl}
            controls
            autoPlay
            playsInline
            className="max-w-[100vw] max-h-[100vh]"
            onPointerDown={(e) =>
              e.stopPropagation()
            }
          />
        )}
      </div>

      {/* ZOOM BUTTONS */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1.5 rounded-full bg-white/15 backdrop-blur"
      >
        <button
          onClick={() =>
            setScale((s) =>
              clampScale(
                s - 0.25,
              ),
            )
          }
          className="w-10 h-10 rounded-full text-white flex items-center justify-center hover:bg-white/10"
          type="button"
        >
          <Minus size={19} />
        </button>

        <span className="text-white text-xs min-w-[45px] text-center">
          {Math.round(
            scale * 100,
          )}
          %
        </span>

        <button
          onClick={() =>
            setScale((s) =>
              clampScale(
                s + 0.25,
              ),
            )
          }
          className="w-10 h-10 rounded-full text-white flex items-center justify-center hover:bg-white/10"
          type="button"
        >
          <Plus size={19} />
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   MENU
================================================================ */

function MenuList({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-2">
      {children}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-black/5 text-left"
      style={{
        color: danger
          ? 'var(--danger)'
          : 'var(--text)',
      }}
      type="button"
    >
      <span
        style={{
          color: danger
            ? 'var(--danger)'
            : 'var(--text-soft)',
        }}
      >
        {icon}
      </span>

      <span>{label}</span>
    </button>
  );
}

function MenuDivider() {
  return (
    <div
      className="h-px my-1"
      style={{
        background:
          'var(--border)',
      }}
    />
  );
}

/* ================================================================
   STAT
================================================================ */

function Stat({
  label,
  value,
  text,
}: {
  label: string;
  value: number | string;
  text?: boolean;
}) {
  return (
    <div className="rounded-xl p-3 surface-soft border border-app">
      <div className="text-xs text-muted mb-1">
        {label}
      </div>

      <div
        className={`font-semibold text-main ${
          text
            ? 'text-sm'
            : 'text-xl'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
