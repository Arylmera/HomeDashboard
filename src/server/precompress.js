import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { brotliCompressSync, gzipSync, constants as zlibConstants } from 'node:zlib';

const COMPRESSIBLE = new Set(['.js', '.css', '.html', '.svg', '.json', '.map']);
const MIN_BYTES = 1024;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/**
 * Pre-compress dist/* assets to .br and .gz at build time, and serve
 * them from `vite preview` when Accept-Encoding allows.
 *
 * Saves CPU at request time and keeps full Brotli quality (which on-the-fly
 * middleware rarely affords).
 */
export function precompressPlugin() {
  return {
    name: 'precompress',
    apply: 'build',
    closeBundle() {
      const dist = join(process.cwd(), 'dist');
      if (!existsSync(dist)) return;
      let n = 0, savedBr = 0, savedGz = 0, total = 0;
      for (const file of walk(dist)) {
        const ext = extname(file);
        if (!COMPRESSIBLE.has(ext)) continue;
        const buf = readFileSync(file);
        if (buf.length < MIN_BYTES) continue;
        const br = brotliCompressSync(buf, {
          params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
        });
        const gz = gzipSync(buf, { level: 9 });
        writeFileSync(file + '.br', br);
        writeFileSync(file + '.gz', gz);
        n++;
        total += buf.length;
        savedBr += buf.length - br.length;
        savedGz += buf.length - gz.length;
      }
      if (n) {
        const pct = (s) => ((s / total) * 100).toFixed(1);
        // eslint-disable-next-line no-console
        console.log(
          `[precompress] ${n} files | br -${pct(savedBr)}% | gz -${pct(savedGz)}%`,
        );
      }
    },
  };
}

const ENC_EXT = { br: '.br', gzip: '.gz' };
const TYPES = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/**
 * `vite preview` middleware that serves precompressed siblings when
 * the client supports them. Falls through otherwise.
 */
export function precompressServePlugin() {
  return {
    name: 'precompress-serve',
    apply: 'serve', // also active in `vite preview`
    configurePreviewServer(server) {
      const dist = join(process.cwd(), 'dist');
      server.middlewares.use((req, res, next) => {
        try {
          const url = (req.url || '/').split('?')[0];
          const ext = extname(url);
          if (!COMPRESSIBLE.has(ext)) return next();
          const ae = String(req.headers['accept-encoding'] || '');
          const enc = ae.includes('br') ? 'br' : ae.includes('gzip') ? 'gzip' : null;
          if (!enc) return next();
          const filePath = join(dist, url);
          const compressed = filePath + ENC_EXT[enc];
          if (!existsSync(compressed)) return next();
          res.setHeader('Content-Encoding', enc);
          res.setHeader('Vary', 'Accept-Encoding');
          res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.end(readFileSync(compressed));
        } catch {
          next();
        }
      });
    },
  };
}
