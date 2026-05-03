import { useEffect, useRef, useState } from 'react';

/**
 * Render `children` only once the placeholder enters (or nears) the
 * viewport. Below-the-fold cards skip mounting their data hooks until
 * the user scrolls toward them, eliminating wasted upstream requests
 * on cold loads of long pages.
 *
 * Once visible, stays mounted (we don't tear down on scroll-out — that
 * would re-fire fetches and lose component state).
 *
 * Props:
 *   rootMargin: how far ahead to start mounting (default 200px below)
 *   minHeight:  reserved space so layout doesn't jump on mount
 *   className:  forwarded to the wrapper div
 */
export function LazyMount({ children, rootMargin = '200px', minHeight = 120, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver !== 'function') {
      // SSR/old-browser fallback — render immediately.
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            return;
          }
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className={className} style={visible ? undefined : { minHeight }}>
      {visible ? children : null}
    </div>
  );
}
