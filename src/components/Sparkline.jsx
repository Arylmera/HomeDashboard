import { useMemo } from 'react';

// Catmull-Rom → cubic Bézier (tension 0.5) for smooth curves through every sample.
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export default function Sparkline({
  data,
  color = "var(--ember)",
  w = 260, h = 56,
  seed = 0,
  maxPoints = 128,
  domain = null,
  pad = 0.08,
  format = (v) => Math.round(v),
  showLabels = true,
  showGrid = true,
  showTimeTicks = true,
  smooth = true,
  axisLabel = "24h",
  className = "nas-spark",
}) {
  const tail = useMemo(() => {
    if (!data || !data.length) return null;
    let arr = data.slice(-maxPoints);
    // Single sample: duplicate so we always have a flat line to draw.
    if (arr.length === 1) arr = [arr[0], arr[0]];
    return arr;
  }, [data, maxPoints]);
  const scale = useMemo(() => {
    if (!tail || tail.length < 2) return null;
    let lo, hi;
    if (domain) { [lo, hi] = domain; }
    else {
      lo = Math.min(...tail); hi = Math.max(...tail);
      const span = (hi - lo) || Math.max(1, Math.abs(hi) * 0.1);
      lo -= span * pad; hi += span * pad;
    }
    const span = (hi - lo) || 1;
    return { lo, hi, span, vmin: Math.min(...tail), vmax: Math.max(...tail), last: tail[tail.length - 1] };
  }, [tail, domain, pad]);

  if (!tail || tail.length < 2 || !scale) {
    return (
      <svg
        className={className}
        viewBox={`0 0 ${w} ${h}`}
        width={w} height={h}
        preserveAspectRatio="none"
        style={{ width: '100%', maxWidth: '100%' }}
      />
    );
  }

  const padTop = 8, padBot = 10;
  const innerH = h - padTop - padBot;
  const stepX = w / (tail.length - 1);
  const yOf = (v) => padTop + innerH - ((v - scale.lo) / scale.span) * innerH;
  const pts = tail.map((v, i) => [i * stepX, yOf(v)]);
  const line = smooth
    ? smoothPath(pts)
    : pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const gid = `sg-${seed}`;
  const gridLevels = [0.25, 0.5, 0.75];
  const lastX = pts[pts.length - 1][0];
  const lastY = pts[pts.length - 1][1];

  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      width={w} height={h}
      preserveAspectRatio="none"
      style={{ width: '100%', maxWidth: '100%' }}
    >
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {showGrid && gridLevels.map((g, i) => {
        const y = padTop + innerH * g;
        return <line key={i} x1="0" x2={w} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />;
      })}

      {showTimeTicks && (
        <>
          <line x1="0.5" x2="0.5" y1={padTop} y2={h - padBot} stroke="currentColor" strokeOpacity="0.18" vectorEffect="non-scaling-stroke" />
          <line x1={(w / 2).toFixed(1)} x2={(w / 2).toFixed(1)} y1={h - padBot - 2} y2={h - padBot + 1} stroke="currentColor" strokeOpacity="0.18" vectorEffect="non-scaling-stroke" />
          <line x1={(w - 0.5).toFixed(1)} x2={(w - 0.5).toFixed(1)} y1={padTop} y2={h - padBot} stroke="currentColor" strokeOpacity="0.18" vectorEffect="non-scaling-stroke" />
        </>
      )}

      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

      <circle cx={lastX} cy={lastY} r="2" fill={color} />

      {showLabels && (
        <g style={{ font: "9px var(--font-mono, ui-monospace)", fill: "currentColor", fillOpacity: 0.55 }}>
          <text x="3" y={padTop + 7}>max {format(scale.vmax)}</text>
          <text x="3" y={h - 2}>min {format(scale.vmin)}</text>
          <text x={w - 3} y={h - 2} textAnchor="end" fillOpacity="0.4">−{axisLabel}  ·  now</text>
        </g>
      )}
    </svg>
  );
}
