/* ============================================================== *
 *  useAlbumColor — extract dominant vibrant color from album art.
 *
 *  Canvas-based, no deps. Samples a small downscaled copy of the
 *  image, buckets pixels by hue, picks the most-populated bucket
 *  weighted toward saturated mid-light pixels (avoids muddy blacks
 *  and washed-out highlights). Returns CSS-ready values.
 * ============================================================== */
import { useEffect, useState } from 'react';

const CACHE = new Map(); // url → { accent, accentSoft, bgGrad, ink }
const FALLBACK = {
  accent: 'oklch(0.78 0.16 145)',
  accentSoft: 'oklch(0.78 0.16 145 / 0.18)',
  bgGrad: 'radial-gradient(circle at 30% 20%, oklch(0.30 0.08 145 / 0.45), transparent 60%)',
  ink: 'oklch(0.15 0.02 240)',
};

export function useAlbumColor(imageUrl) {
  const [palette, setPalette] = useState(() => (imageUrl && CACHE.get(imageUrl)) || FALLBACK);

  useEffect(() => {
    if (!imageUrl) { setPalette(FALLBACK); return; }
    const cached = CACHE.get(imageUrl);
    if (cached) { setPalette(cached); return; }

    let cancelled = false;
    extractPalette(imageUrl).then(p => {
      if (cancelled) return;
      CACHE.set(imageUrl, p);
      setPalette(p);
    }).catch(() => {
      if (!cancelled) setPalette(FALLBACK);
    });

    return () => { cancelled = true; };
  }, [imageUrl]);

  return palette;
}

function extractPalette(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = reject;
    img.onload = () => {
      try {
        const SIZE = 48;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

        // 24 hue buckets; weight by saturation × mid-light bias.
        const buckets = new Array(24).fill(0).map(() => ({ r: 0, g: 0, b: 0, w: 0 }));
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
          if (a < 128) continue;
          const [h, s, l] = rgbToHsl(r, g, b);
          if (l < 0.12 || l > 0.92) continue;          // skip near-black / near-white
          if (s < 0.18) continue;                       // skip greys
          const idx = Math.min(23, Math.floor(h * 24));
          const lightBias = 1 - Math.abs(l - 0.55) * 1.8; // peak around l=0.55
          const w = s * Math.max(0.1, lightBias);
          buckets[idx].r += r * w;
          buckets[idx].g += g * w;
          buckets[idx].b += b * w;
          buckets[idx].w += w;
        }

        let best = null;
        for (const bk of buckets) {
          if (bk.w > 0 && (!best || bk.w > best.w)) best = bk;
        }
        if (!best) return resolve(FALLBACK);

        const r = Math.round(best.r / best.w);
        const g = Math.round(best.g / best.w);
        const b = Math.round(best.b / best.w);

        // Normalize lightness to a punchy display value.
        let [h, s, l] = rgbToHsl(r, g, b);
        s = Math.max(0.55, Math.min(0.95, s + 0.1));
        const accentL = Math.max(0.55, Math.min(0.72, l < 0.5 ? l + 0.18 : l));
        const [ar, ag, ab] = hslToRgb(h, s, accentL);
        const accent = `rgb(${ar} ${ag} ${ab})`;
        const accentSoft = `rgba(${ar}, ${ag}, ${ab}, 0.18)`;

        // Background tint — dimmer, lower-sat version for mesh gradient.
        const [br, bg, bb] = hslToRgb(h, Math.min(0.6, s), 0.22);
        const [b2r, b2g, b2b] = hslToRgb((h + 0.08) % 1, Math.min(0.5, s), 0.16);
        const bgGrad = `radial-gradient(circle at 25% 15%, rgba(${br},${bg},${bb},0.55), transparent 55%), ` +
                       `radial-gradient(circle at 80% 90%, rgba(${b2r},${b2g},${b2b},0.45), transparent 60%)`;

        // Foreground ink for buttons sitting on accent fill.
        const ink = accentL > 0.6 ? 'oklch(0.15 0.02 240)' : 'oklch(0.98 0 0)';

        resolve({ accent, accentSoft, bgGrad, ink });
      } catch (e) {
        reject(e);
      }
    };
    img.src = url;
  });
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
