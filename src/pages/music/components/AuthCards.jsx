export function AuthCards({ spAuth, soAuth }) {
  return (
    <div className="auth-cards">
      <ServiceCard
        name="Spotify"
        configured={spAuth.configured}
        authenticated={spAuth.authenticated}
        loginHref="/api/spotify/oauth/login"
        envKeys={['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REDIRECT_URI']}
      />
      <SonosLanCard auth={soAuth} />
    </div>
  );
}

function SonosLanCard({ auth }) {
  if (auth.authenticated) {
    return (
      <div className="auth-card auth-card-ok">
        <div className="auth-card-name">Sonos</div>
        <div className="auth-card-state">discovered on LAN</div>
      </div>
    );
  }
  return (
    <div className="auth-card auth-card-warn">
      <div className="auth-card-name">Sonos</div>
      <div className="auth-card-state">no speakers found</div>
      <div className="auth-card-hint">
        Speakers are discovered via SSDP. If your network blocks multicast,
        set <code>SONOS_HOSTS</code> in <code>.env</code> to a comma-separated
        list of speaker IPs and restart.
      </div>
    </div>
  );
}

function ServiceCard({ name, configured, authenticated, loginHref, envKeys }) {
  if (authenticated) {
    return (
      <div className="auth-card auth-card-ok">
        <div className="auth-card-name">{name}</div>
        <div className="auth-card-state">connected</div>
      </div>
    );
  }
  if (!configured) {
    return (
      <div className="auth-card auth-card-warn">
        <div className="auth-card-name">{name}</div>
        <div className="auth-card-state">not configured</div>
        <div className="auth-card-hint">
          Set <code>{envKeys.join(', ')}</code> in <code>.env</code>.
        </div>
      </div>
    );
  }
  return (
    <div className="auth-card">
      <div className="auth-card-name">{name}</div>
      <div className="auth-card-state">configured · not signed in</div>
      <a className="auth-card-cta" href={loginHref}>Connect {name}</a>
    </div>
  );
}
