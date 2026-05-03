import { statusClass } from '../utils.js';

export default function Dot({ s }) {
  return <span className={`status-dot ${statusClass(s)}`} title={s} />;
}
