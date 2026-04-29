# better-sqlite3

Synchronous SQLite driver. Used by `src/server/prefs.js` to persist user preferences in `/data/prefs.db` (volume-mounted).

## Rules

- **Synchronous API by design.** Don't `await` it. SQLite calls are fast enough that blocking is a non-issue for a single-user dashboard.
- **Prepare statements once, reuse them.** `db.prepare(sql)` is the slow step; `.run()` / `.get()` / `.all()` on the prepared statement is fast.

  ```js
  const insert = db.prepare('INSERT INTO prefs (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v');
  insert.run(key, JSON.stringify(value));
  ```

- **Always parameterize.** Never interpolate user input into SQL — SQL injection still applies even with a local DB.
- **Use transactions for batches.** `db.transaction(fn)` is ~100x faster than N individual writes.
- **Enable WAL mode** at boot (`db.pragma('journal_mode = WAL')`) for concurrent reads while writing.
- **Close on shutdown** (`db.close()`) when relevant — though for a long-lived server it's optional.
- **Volume-mount the DB file**, never bake into the image. The compose file mounts `/data`; lose that volume, lose the prefs.

## Schema management

- Keep schema bootstrap idempotent: `CREATE TABLE IF NOT EXISTS …` at startup.
- For migrations, use a `user_version` pragma and a switch on it.

## Pitfalls

- Native module — must be rebuilt for the target Node ABI. Building inside the Docker `build` stage handles this; don't copy `node_modules` from the host.
- `.get()` returns `undefined` if no row matches — not `null`.
