import { useMemo } from 'react';

/* Inline SVG sparkline. Pure render — no DOM measurements, so it's
 * cheap inside frequently re-rendered rows. */
export function Sparkline({ values, w = 64, h = 16, stroke = 'currentColor', fill = 'none', ariaLabel }) {
  const path = useMemo(() => {
    if (!Array.isArray(values) || values.length < 2) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = w / (values.length - 1);
    return values
      .map((v, i) => {
        const x = i * stepX;
        const y = h - ((v - min) / range) * h;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [values, w, h]);

  if (!path) return <span className="spark-empty" aria-hidden="true" />;
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-label={ariaLabel} role={ariaLabel ? 'img' : 'presentation'}>
      <path d={path} stroke={stroke} fill={fill} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
