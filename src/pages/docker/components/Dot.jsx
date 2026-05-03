import { stateClass } from '../utils.js';

export default function Dot({ s }) {
  return <span className={`status-dot ${stateClass(s)}`} title={s} />;
}
