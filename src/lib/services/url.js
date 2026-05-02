/* Base URL builder for the SERVICES registry.
 * Swap PREFER between "fqdn" (Nginx proxy) and "lan" globally here.
 */

export const LAN  = "http://192.168.1.100";
export const FQDN = "https://__sub__.arylmera.duckdns.org";

const PREFER = "fqdn";

export const url = (sub, port) =>
  PREFER === "fqdn" && sub
    ? FQDN.replace("__sub__", sub)
    : `${LAN}:${port}`;
