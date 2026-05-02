/* Barrel — keeps existing imports working after the split.
 * New code: prefer importing from ./services/registry.js or ./services/url.js. */
export { SECTIONS, ALL_SERVICES } from "./services/registry.js";
export { LAN, FQDN, url } from "./services/url.js";
