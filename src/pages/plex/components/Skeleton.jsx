/* Tiny shimmer block. Use sparingly — for areas where the dash
 * placeholder feels too brutalist. */
export function Skeleton({ w = '100%', h = 12, radius = 4, className = '' }) {
  return <span className={`skel ${className}`} style={{ width: typeof w === 'number' ? `${w}px` : w, height: typeof h === 'number' ? `${h}px` : h, borderRadius: radius }} aria-hidden="true" />;
}
