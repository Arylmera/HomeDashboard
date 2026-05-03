/* Page lede + hint banner. Renders the right copy for each Homey
 * connection state: live, missing config, configured-not-authorized,
 * authorized-but-error, or connecting.
 */
export default function StatusLede({ isLive, auth, homey, zones, flows, stats }) {
  return (
    <>
      <p className="page-lede">
        {isLive
          ? <>Live from Homey via cloud OAuth · {zones.length} zones · {stats.totalDevs} devices · {flows.length} flows. Auto-refresh every 30s.</>
          : !auth.configured
            ? <>Homey OAuth not configured. Set <code>HOMEY_CLIENT_ID</code>, <code>HOMEY_CLIENT_SECRET</code>, <code>HOMEY_REDIRECT_URI</code>, and <code>HOMEY_ID</code> in <code>.env</code>, then restart the dev server. Showing layout placeholders below.</>
            : !auth.authenticated
              ? <>Homey OAuth configured but not authorized yet. Click "Connect Homey" below to authorize once.</>
              : homey.state === 'error'
                ? <>Authorized, but Homey API is unreachable. Check the cloud-routed URL or token state.</>
                : <>Connecting to Homey…</>}
      </p>

      {!isLive && (
        <div className="hint-banner">
          {auth.configured && !auth.authenticated ? (
            <>
              <b>Connect Homey:</b>{' '}
              <a href="/api/homey/oauth/login">Authorize via Athom</a>
              {". This opens the Homey login page; you'll be redirected back here."}
            </>
          ) : (
            <>
              <b>Live tiles:</b> Nextcloud · Speedtest. <b>Placeholder:</b> zones and flows. Set up an OAuth2 app at <a href="https://tools.developer.homey.app/" target="_blank" rel="noopener noreferrer">tools.developer.homey.app</a> (Apps, then New) and fill the <code>HOMEY_*</code> vars in <code>.env</code>.
            </>
          )}
        </div>
      )}
    </>
  );
}
