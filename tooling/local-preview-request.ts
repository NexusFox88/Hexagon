import { request } from 'node:http';

/** Test transport: connect loopback while preserving the preview virtual host.
 * Node's fetch in this environment replaces a caller-supplied Host header.
 */
export function localPreviewRequest(url: URL, port: number, path: string, cookie?: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method: 'GET', headers: { host: url.host, ...(cookie ? { cookie } : {}) } }, response => {
      const chunks: Buffer[] = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(response.headers)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) headers.append(key, item);
        resolve(new Response(new Uint8Array(Buffer.concat(chunks)), { status: response.statusCode, headers }));
      });
    });
    req.setTimeout(30000, () => req.destroy(new Error('preview_test_timeout')));
    req.on('error', reject); req.end();
  });
}
