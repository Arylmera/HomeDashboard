/* ============================================================== *
 *  Homey page icons + zone-name → icon matching.
 * ============================================================== */

export const I = {
  lamp:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>,
  plug:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5"/><path d="M9 7V2"/><path d="M15 7V2"/><path d="M6 13V8a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4Z"/></svg>,
  thermo:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>,
  sensor:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12a10 10 0 0 1 20 0"/><path d="M5 12a7 7 0 0 1 14 0"/><path d="M8.5 12a3.5 3.5 0 0 1 7 0"/><circle cx="12" cy="12" r="1"/></svg>,
  door:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/></svg>,
  motion:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5" r="2"/><path d="m9 20 3-6 3 4 3-1"/><path d="M5.4 13.1 9 14l2 6"/><path d="m11 9 3 3 4-2"/></svg>,
  sofa:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z"/><path d="M4 18v2"/><path d="M20 18v2"/></svg>,
  kitchen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M3 10h18"/><path d="M7 6.5h.01"/><path d="M7 15h.01"/></svg>,
  bed:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>,
  office:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>,
  bath:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5H4"/><path d="M14 4h6"/><path d="M6 22v-3"/><path d="M18 22v-3"/></svg>,
  toilet:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 11h14"/><path d="M19 11a7 7 0 0 1-7 7 7 7 0 0 1-7-7"/><path d="M11 18v3"/><path d="M8 21h8"/><path d="M7 11V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v7"/></svg>,
  dining:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V2"/><path d="M5 11v11"/><path d="M16 11h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2Z"/><path d="M16 22V2"/></svg>,
  laundry: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="14" r="5"/><path d="M7 7h.01"/><path d="M11 7h.01"/></svg>,
  music:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  terrace: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
  gear:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.9 19.1 1.4-1.4"/><path d="m17.7 6.3 1.4-1.4"/><circle cx="12" cy="12" r="4"/></svg>,
  house:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/></svg>,
};

export const DEV_ICON = {
  light: I.lamp, socket: I.plug, thermostat: I.thermo,
  sensor: I.sensor, door: I.door, motion: I.motion,
};

function normalize(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Order matters: more specific terms first.
const ZONE_RULES = [
  [/salle\s+(de\s+|a\s+)?bain|salle\s+d['e]?eau|bathroom/, I.bath],
  [/toilette|wc/,                                          I.toilet],
  [/salle\s+a\s+manger|dining/,                            I.dining],
  [/cuisine|kitchen/,                                      I.kitchen],
  [/bu[ad]nderie|laundry/,                                 I.laundry],
  [/chambre|bedroom/,                                      I.bed],
  [/bureau|office/,                                        I.office],
  [/salon|living\s*room|lounge/,                           I.sofa],
  [/terrace|terrasse|jardin|balcon|garden/,                I.terrace],
  [/music|musique/,                                        I.music],
  [/technical|technique|local\s+technique/,                I.gear],
  [/hall\s+d['e]?\s*entree|entrance|entr[ée]e/,            I.door],
  [/hall\s+de\s+nuit|night/,                               I.bed],
  [/hall|couloir|corridor/,                                I.door],
  [/home|maison/,                                          I.house],
];

export function iconForZone(name) {
  const n = normalize(name);
  for (const [re, icon] of ZONE_RULES) if (re.test(n)) return icon;
  return I.sofa;
}

// Hide hidden-by-convention zones (Homey uses underscore prefix for meta).
export function isHiddenZone(name) { return /^_/.test(name || ""); }
