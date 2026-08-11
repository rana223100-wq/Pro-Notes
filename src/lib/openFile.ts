import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Strip the data:URL prefix and split into mime + base64 payload.
 * e.g. "data:application/pdf;base64,JVBERi0xLjQ..." => { mime: "application/pdf", base64: "JVBERi0xLjQ..." }
 */
function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

/** Guess a file extension from the mime type when the name lacks one. */
function extFromMime(mime: string): string {
  const map: Record<string, string> = {
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
  };
  return map[mime] || 'bin';
}

/** Extract a clean filename with an extension. */
function buildFileName(name: string, mime: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'attachment';
  if (/\.[a-zA-Z0-9]{2,5}$/.test(safe)) return safe;
  return `${safe}.${extFromMime(mime)}`;
}

/**
 * Open a file attachment in the device's native app chooser.
 *
 * On Android (Capacitor) this writes the base64 payload to the cache directory
 * and launches the Share sheet, which lets the user pick any compatible app
 * (PDF reader, Word, Excel, image viewer, etc.) to open the file with.
 *
 * On web (browser), falls back to opening the data URL in a new tab.
 */
export async function openFileAttachment(name: string, dataUrl: string): Promise<void> {
  const parsed = parseDataUrl(dataUrl);

  // Web fallback — open in a new browser tab.
  if (!parsed || !(window as any).capacitor?.isNative) {
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
    // If share fails (e.g. no compatible app), fall back to opening in browser.
    console.warn('openFileAttachment failed:', err);
    window.open(dataUrl, '_blank');
  }
}
