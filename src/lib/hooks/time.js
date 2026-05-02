import { useState, useEffect, useMemo } from 'react';

export function useClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useGreeting() {
  return useMemo(() => {
    const h = new Date().getHours();
    if (h < 5)  return "Late night";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 22) return "Good evening";
    return "Late night";
  }, []);
}
