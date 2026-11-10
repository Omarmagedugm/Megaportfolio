import { Readable } from 'node:stream';
import { mediaBucket } from '../../../lib/portfolio-server';

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[\da-f-]{36}\.(jpg|png|webp|mp4|webm)$/.test(key)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const file = mediaBucket().file('portfolio/' + key);
    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size);
    const headers = new Headers({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': metadata.contentType || 'application/octet-stream',
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
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Cache-Control': 'no-store' } });
      }
      headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    }
    headers.set('Content-Length', String(end - start + 1));
    const stream = Readable.toWeb(file.createReadStream(range ? { start, end } : {}));
    return new Response(stream as ReadableStream<Uint8Array>, { status: range ? 206 : 200, headers });
  } catch (error) {
    const missing = (error as { code?: number }).code === 404;
    return new Response(missing ? 'Not found' : 'Media unavailable', { status: missing ? 404 : 503 });
  }
}
