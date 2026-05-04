/* Tiny pub/sub toast bus. Components subscribe via useToasts(); any
 * caller fires toast({ message }). Auto-dismisses after `ttl` ms. */
import { useEffect, useState } from 'react';

const subs = new Set();
let nextId = 1;

export function toast(msg, { ttl = 2400, kind = 'info' } = {}) {
  const id = nextId++;
  const t = { id, message: msg, kind };
  for (const cb of subs) cb({ type: 'add', toast: t });
  setTimeout(() => {
    for (const cb of subs) cb({ type: 'remove', id });
  }, ttl);
  return id;
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
