import { ICONS } from '../../../lib/icons.jsx';

export default function Mark({ id }) {
  if (!ICONS[id]) {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>;
  }
  return ICONS[id].svg;
}
