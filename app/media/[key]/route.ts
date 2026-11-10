import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

const MEDIA_DIR = '/tmp/mega-portfolio-media';

const mimeByExt: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const extMatch = /^[\da-f-]{36}\.(jpg|png|webp|mp4|webm)$/.exec(key);
  if (!extMatch) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const filePath = path.join(MEDIA_DIR, key);
    const fileStat = await stat(filePath);
    const size = fileStat.size;
    let contentType = mimeByExt[extMatch[1]] || 'application/octet-stream';
    try {
      const metaRaw = await readFile(filePath + '.meta.json', 'utf8');
      const meta = JSON.parse(metaRaw) as { contentType?: string };
      if (meta.contentType) contentType = meta.contentType;
    } catch {
      // Use extension fallback
    }

    const headers = new Headers({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
    });

    const range = request.headers.get('range');
    let start = 0;
    let end = size - 1;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (match?.[1]) {
        start = Number(match[1]);
        if (match[2]) end = Math.min(end, Number(match[2]));
      } else if (match?.[2]) {
        start = Math.max(0, size - Number(match[2]));
      }
      if (!match || (!match[1] && !match[2]) || start >= size || end < start) {
        return new Response(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${size}`,
            'Cache-Control': 'no-store',
          },
        });
      }
      headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    }
    headers.set('Content-Length', String(end - start + 1));
    const stream = Readable.toWeb(
      createReadStream(filePath, range ? { start, end } : undefined)
    );
    return new Response(stream as ReadableStream<Uint8Array>, {
      status: range ? 206 : 200,
      headers,
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
