-- Full schema from design.md §1 (decisions.md S1-1), plus email_previews (S1-2).
-- Applied on every start; IF NOT EXISTS keeps it idempotent.
-- IDs are TEXT, timestamps are ISO-8601 UTC TEXT, JSON columns are TEXT.

CREATE TABLE IF NOT EXISTS users (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL,
  role  TEXT NOT NULL CHECK (role IN ('user', 'admin'))
);

CREATE TABLE IF NOT EXISTS channel_types (
  type    TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS channel_connections (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id),
  type       TEXT NOT NULL,
  label      TEXT NOT NULL,
  config     TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_channel_connections_user ON channel_connections (user_id);

CREATE TABLE IF NOT EXISTS sources (
  id           TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  enabled      INTEGER NOT NULL DEFAULT 1,
  enabled_at   TEXT NOT NULL,
  last_poll_at TEXT,
  last_error   TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users (id),
  name         TEXT NOT NULL,
  source_id    TEXT NOT NULL REFERENCES sources (id),
  keywords     TEXT NOT NULL,
  min_severity TEXT NOT NULL CHECK (min_severity IN ('low', 'medium', 'high')),
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_source_active ON alerts (source_id, active);

-- DS4: a connection that alerts still use cannot be deleted.
CREATE TABLE IF NOT EXISTS alert_connections (
  alert_id      TEXT NOT NULL REFERENCES alerts (id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL REFERENCES channel_connections (id) ON DELETE RESTRICT,
  PRIMARY KEY (alert_id, connection_id)
);

CREATE TABLE IF NOT EXISTS events (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL REFERENCES sources (id),
  source_event_id TEXT NOT NULL,
  title           TEXT NOT NULL,
  summary         TEXT NOT NULL,
  url             TEXT,
  severity        TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  occurred_at     TEXT NOT NULL,
  received_at     TEXT NOT NULL,
  UNIQUE (source_id, source_event_id)
);
CREATE INDEX IF NOT EXISTS idx_events_received ON events (received_at);

CREATE TABLE IF NOT EXISTS email_previews (
  id         TEXT PRIMARY KEY,
  subject    TEXT NOT NULL,
  html       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- DS5: rows survive deletes (SET NULL + snapshot columns). DS8: kind 'test' rows
-- have NULL alert_id/event_id, so the UNIQUE key never dedupes them.
CREATE TABLE IF NOT EXISTS deliveries (
  id               TEXT PRIMARY KEY,
  kind             TEXT NOT NULL CHECK (kind IN ('alert', 'test')),
  user_id          TEXT NOT NULL REFERENCES users (id),
  alert_id         TEXT REFERENCES alerts (id) ON DELETE SET NULL,
  event_id         TEXT REFERENCES events (id),
  connection_id    TEXT REFERENCES channel_connections (id) ON DELETE SET NULL,
  alert_name       TEXT,
  connection_label TEXT NOT NULL,
  channel_type     TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'dry-run', 'failed')),
  error            TEXT,
  preview_id       TEXT REFERENCES email_previews (id),
  created_at       TEXT NOT NULL,
  UNIQUE (alert_id, event_id, connection_id)
);
CREATE INDEX IF NOT EXISTS idx_deliveries_user_created ON deliveries (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_created ON deliveries (created_at);
