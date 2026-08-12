import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/zip': 'zip',
  'application/x-rar-compressed': 'rar',
  'application/json': 'json',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'text/html': 'html',
  'text/xml': 'xml',
  'application/rtf': 'rtf',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

function extFromMime(mime: string): string {
  return MIME_EXT[mime] || 'bin';
}

function buildFileName(name: string, mime: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'attachment';
  if (/\.[a-zA-Z0-9]{2,5}$/.test(safe)) return safe;
  return `${safe}.${extFromMime(mime)}`;
}

function isNative(): boolean {
  return !!(window as any).capacitor?.isNative;
}

/**
 * Open a file attachment in the device's native app chooser.
 * Writes the base64 payload to cache, then launches the Share sheet
 * which lets the user pick any compatible installed app to open the file with.
 * Falls back to opening the data URL in a new browser tab on web.
 */
export async function openFileAttachment(name: string, dataUrl: string): Promise<void> {
  const parsed = parseDataUrl(dataUrl);

  if (!parsed || !isNative()) {
    window.open(dataUrl, '_blank');
    return;
  }

  const fileName = buildFileName(name, parsed.mime);

  try {
    const fileResult = await Filesystem.writeFile({
      path: `ProNotes/${fileName}`,
      data: parsed.base64,
      directory: Directory.Cache,
      recursive: true,
    });

    await Share.share({
      title: name,
      url: fileResult.uri,
      dialogTitle: 'Open with…',
    });
  } catch (err) {
    console.warn('openFileAttachment failed:', err);
    window.open(dataUrl, '_blank');
  }
}

/**
 * Open a file attachment in an in-app fullscreen viewer with zoom support.
 * Returns the data URL so the caller can pass it to a viewer component.
 * On native this also pre-writes the file to cache so the viewer can use
 * a file:// URL for better compatibility with large documents.
 */
export async function prepareFileForViewer(name: string, dataUrl: string): Promise<string> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed || !isNative()) return dataUrl;

  const fileName = buildFileName(name, parsed.mime);
  try {
    const fileResult = await Filesystem.writeFile({
      path: `ProNotes/${fileName}`,
      data: parsed.base64,
      directory: Directory.Cache,
      recursive: true,
    });
    return fileResult.uri;
  } catch {
    return dataUrl;
  }
}
