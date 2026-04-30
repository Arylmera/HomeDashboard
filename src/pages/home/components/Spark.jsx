import { useMemo } from 'react';

export default function Spark({ data, color = "var(--ember)", w = 200, h = 28 }) {
  const path = useMemo(() => {
    if (!data || !data.length) return "";
    const min = Math.min(...data), max = Math.max(...data);
    const span = max - min || 1;
    return data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }, [data, w, h]);
  if (!path) return <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" />;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${path} L${w},${h} L0,${h} Z`} fill={color} fillOpacity="0.12" />
    </svg>
  );
}
