export type Category = 'All' | 'Work' | 'Personal' | 'Important' | 'Checklist';
export type Filter = 'All' | 'Pin' | 'Favorites' | 'Lock' | 'Trash';

export interface NoteAttachment {
  id: string;
  kind: 'image' | 'video' | 'file';
  name: string;
  dataUrl: string;
  mime: string;
  size: number;
  width?: number;
  zBehind?: boolean;
  x?: number;
  y?: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  plain: string;
  category: Exclude<Category, 'All'>;
  pinned: boolean;
  favorite: boolean;
  locked: boolean;
  inTrash: boolean;
  lockPassword?: string;
  attachments: NoteAttachment[];
  createdAt: number;
  modifiedAt: number;
  font: string;
  pageColor: string;
  textColor: string;
}
