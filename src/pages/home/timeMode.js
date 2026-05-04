/* Home time-aware layout helpers.
 *
 * - timeModeFor(date) → 'morning' | 'afternoon' | 'evening' | 'night'
 * - SECTION_ORDERS: per-mode order array using section keys
 *   ('pages' | 'quickapps' | 'recent' | 'day' | 'bottom').
 *   'pages' is always first — it's the primary entry point. */

export function timeModeFor(date) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 23) return 'evening';
  return 'night';
}

export const SECTION_ORDERS = {
  default:   ['pages', 'quickapps', 'recent', 'day', 'bottom'],
  morning:   ['pages', 'day',       'quickapps', 'recent', 'bottom'],
  afternoon: ['pages', 'quickapps', 'recent',    'day',    'bottom'],
  evening:   ['pages', 'recent',    'quickapps', 'day',    'bottom'],
  night:     ['pages', 'bottom',    'quickapps', 'day',    'recent'],
};
