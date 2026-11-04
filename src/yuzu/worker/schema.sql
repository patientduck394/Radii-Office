-- Yuzu Mail database (Cloudflare D1). Run once: npx wrangler d1 execute yuzu-mail --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS accounts (
    username TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    salt TEXT NOT NULL,
    hash TEXT NOT NULL,
    created INTEGER NOT NULL,
    fails INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    folder TEXT NOT NULL,          -- inbox, sent or trash
    prev TEXT,                     -- where a trashed message goes back to
    from_addr TEXT NOT NULL,
    to_addr TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    date INTEGER NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    starred INTEGER NOT NULL DEFAULT 0,
    msgid TEXT
);
CREATE INDEX IF NOT EXISTS messages_by_user ON messages (username, folder, date DESC);
CREATE TABLE IF NOT EXISTS signups (ip TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS signups_by_ip ON signups (ip, ts);
