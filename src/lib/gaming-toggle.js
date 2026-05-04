/* Gaming-mode toggle — site-wide pill in the topbar.
 *
 * Side-effect mounted from arylmera-menu.js. Polls
 * /api/gaming/state and POSTs /api/gaming/toggle on click.
 * Sits in `.topbar-right` immediately before `.am-trigger`. */

import { el } from './menu/drawer.js';

const POLL_MS = 30_000;

const ICON_PAD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M6 11h4M8 9v4"/><circle cx="15" cy="11" r="0.6" fill="currentColor"/><circle cx="17.5" cy="13" r="0.6" fill="currentColor"/>
  <path d="M5 7h14a3 3 0 0 1 3 3v4a3 3 0 0 1-5.4 1.8L15 14H9l-1.6 1.8A3 3 0 0 1 2 14v-4a3 3 0 0 1 3-3z"/>
</svg>`;

async function fetchJson(url, opts) {
  const r = await fetch(url, { credentials: 'same-origin', ...opts });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  if (!r.ok) {
    const err = new Error(`${url} → ${r.status}`);
    err.status = r.status;
    err.body = data ?? text;
    throw err;
  }
  return data ?? { state: 'error', error: 'invalid json' };
}

function flashError(btn) {
  btn.classList.add('gaming-error');
  setTimeout(() => btn.classList.remove('gaming-error'), 1200);
}

function paint(btn, data, { busy } = {}) {
  const isLive = data?.state === 'live';
  const gaming = !!data?.gaming;
  btn.classList.toggle('gaming-on', isLive && gaming);
  btn.classList.toggle('gaming-busy', !!busy);
  btn.classList.toggle('gaming-idle', data?.state === 'idle');
  btn.setAttribute('aria-pressed', String(isLive && gaming));
  btn.disabled = false; // keep clickable so the user gets feedback
  const countEl = btn.querySelector('.gaming-count');
  if (countEl) {
    const dl = isLive ? (data?.downloading ?? 0) : null;
    countEl.textContent = dl != null ? String(dl) : '';
    countEl.classList.toggle('on', isLive && dl > 0);
  }
  if (data?.state === 'idle') {
    btn.title = 'Gaming mode — qBittorrent not configured (set QBITTORRENT_USER/PASS and restart server)';
    return;
  }
  if (data?.state === 'error') {
    btn.title = `Gaming mode — error: ${data.error || 'unknown'}`;
    return;
  }
  const total = data?.total ?? 0;
  const running = data?.running ?? 0;
  const dl = data?.downloading ?? 0;
  btn.title = gaming
    ? `Gaming ON — 0 running of ${total}. Click to resume.`
    : `Gaming OFF — ${running} running, ${dl} downloading of ${total}. Click to pause all.`;
}

function buildButton() {
  const btn = el('button', {
    class: 'gaming-trigger',
    type: 'button',
    'aria-label': 'Toggle gaming mode',
    'aria-pressed': 'false',
    title: 'Gaming mode',
  });
  btn.innerHTML = `${ICON_PAD}<span class="gaming-label">gaming</span><span class="gaming-count" aria-hidden="true"></span>`;
  return btn;
}

function attach(btn) {
  const slot = document.querySelector('.topbar-right');
  if (!slot) return false;
  if (btn.parentElement === slot) return true;
  const trigger = slot.querySelector('.am-trigger');
  if (trigger) slot.insertBefore(btn, trigger);
  else slot.appendChild(btn);
  return true;
}

function mount() {
  const btn = buildButton();
  let last = null;
  let lastActive = null; // snapshot of {running, downloading} before last pause
  let timer = null;

  const refresh = async () => {
    try {
      const data = await fetchJson('/api/gaming/state');
      last = data;
      // Track the most recent "active" snapshot so we can restore the
      // count instantly when the user toggles gaming OFF.
      if (data?.state === 'live' && !data.gaming) {
        lastActive = { running: data.running ?? 0, downloading: data.downloading ?? 0 };
      }
      paint(btn, data);
    } catch (err) {
      console.error('[gaming-toggle] state fetch failed', err);
      paint(btn, { state: 'error', error: err?.message || 'unreachable' });
    }
  };

  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    if (last?.state === 'idle') {
      console.warn('[gaming-toggle] qBittorrent not configured — set QBITTORRENT_USER/PASS in env and restart the server');
      flashError(btn);
      return;
    }
    // Optimistic flip — paint the new state immediately so the UI feels snappy.
    const prev = last;
    let optimistic = prev;
    if (prev?.state === 'live') {
      if (prev.gaming) {
        // resuming → restore last known active counts so the badge reflects
        // reality immediately. Real values reconcile on next poll.
        optimistic = {
          ...prev,
          gaming: false,
          running: lastActive?.running ?? prev.running ?? 0,
          downloading: lastActive?.downloading ?? prev.downloading ?? 0,
        };
      } else {
        // pausing → snapshot current counts so we can restore them next time.
        lastActive = { running: prev.running ?? 0, downloading: prev.downloading ?? 0 };
        optimistic = { ...prev, gaming: true, running: 0, downloading: 0 };
      }
    }
    last = optimistic;
    paint(btn, optimistic, { busy: true });

    try {
      const data = await fetchJson('/api/gaming/toggle', { method: 'POST' });
      // Only honour the server response if it confirms the optimistic flip
      // (qBit can lag on bulk action — stale "running > 0" replies otherwise
      // bounce the button visually). Mismatch → keep optimistic, let the
      // next scheduled poll reconcile.
      if (data?.state === 'live' && data.gaming === optimistic.gaming) {
        last = data;
        paint(btn, data);
      } else {
        paint(btn, optimistic, { busy: false });
        // Reconcile shortly — qBit usually settles in 1-3s.
        setTimeout(refresh, 1500);
      }
    } catch (err) {
      console.error('[gaming-toggle] toggle failed', err);
      last = prev;
      flashError(btn);
      paint(btn, prev || { state: 'error', error: err?.message || 'toggle failed' });
    }
  });

  if (!attach(btn)) {
    const obs = new MutationObserver(() => { if (attach(btn)) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  refresh();
  timer = setInterval(refresh, POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
  window.addEventListener('beforeunload', () => { if (timer) clearInterval(timer); });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
