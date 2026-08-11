export type Category = 'All' | 'Work' | 'Personal' | 'Important' | 'Checklist';
export type Filter = 'All' | 'Pin' | 'Favorites' | 'Lock' | 'Trash';
export type ThemePref = 'system' | 'dark' | 'light';

export interface NoteAttachment {
  id: string;
  kind: 'image' | 'video' | 'file';
  name: string;
  dataUrl: string; // base64 data URL (kept in storage)
  mime: string;
  size: number;
  width?: number; // display width in px for images/videos
  zBehind?: boolean; // render behind text
  x?: number; // offset px
  y?: number; // offset px
}

export interface Note {
  id: string;
  title: string;
  // HTML content of the note body
  content: string; // rich text HTML
  plain: string; // plain text for search
  category: Exclude<Category, 'All'>;
  pinned: boolean;
  favorite: boolean;
  locked: boolean; // note-level password lock
  inLockFolder: boolean; // moved to the locked folder
  inTrash: boolean;
  lockPassword?: string; // per-note password (if locked)
  attachments: NoteAttachment[];
  createdAt: number;
  modifiedAt: number;
  font: string; // font-family for this note page
  pageColor: string; // background color of note page
  textColor: string; // default text color
}

export interface UserProfile {
  mode: 'guest' | 'account';
  firstName: string;
  lastName: string;
  email?: string;
}
