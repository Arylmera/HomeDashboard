import { ICONS } from '../../../lib/icons.jsx';

export default function Mark({ id }) {
  return ICONS[id] ? ICONS[id].svg : null;
}
