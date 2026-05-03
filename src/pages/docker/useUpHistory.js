import { useEffect, useRef, useState } from 'react';

// Tracks recent `up` count samples in-memory (no persistence) so the
// HealthHero can render a tiny sparkline of the last N polls.
export default function useUpHistory(value, { max = 60 } = {}) {
  const [history, setHistory] = useState([]);
  const last = useRef(null);
  useEffect(() => {
    if (typeof value !== 'number' || Number.isNaN(value)) return;
    if (last.current === value && history.length > 0) return;
    last.current = value;
    setHistory(prev => {
      const next = [...prev, value];
      return next.length > max ? next.slice(next.length - max) : next;
    });
  }, [value, max, history.length]);
  return history;
}
