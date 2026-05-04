/* Tiny pub/sub toast bus. Components subscribe via useToasts(); any
 * caller fires toast({ message }). Auto-dismisses after `ttl` ms. */
import { useEffect, useState } from 'react';

const subs = new Set();
const timers = new Map();
let nextId = 1;

export function toast(msg, { ttl = 2400, kind = 'info' } = {}) {
  const id = nextId++;
  const t = { id, message: msg, kind };
  for (const cb of subs) cb({ type: 'add', toast: t });
  const handle = setTimeout(() => {
    timers.delete(id);
    for (const cb of subs) cb({ type: 'remove', id });
  }, ttl);
  timers.set(id, handle);
  return id;
}

export function dismissToast(id) {
  const h = timers.get(id);
  if (h) { clearTimeout(h); timers.delete(id); }
  for (const cb of subs) cb({ type: 'remove', id });
}

export function useToasts() {
  const [list, setList] = useState([]);
  useEffect(() => {
    const cb = (ev) => {
      if (ev.type === 'add') setList((l) => [...l, ev.toast]);
      else if (ev.type === 'remove') setList((l) => l.filter(t => t.id !== ev.id));
    };
    subs.add(cb);
    return () => { subs.delete(cb); };
  }, []);
  return list;
}
