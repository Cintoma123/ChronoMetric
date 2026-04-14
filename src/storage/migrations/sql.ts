export const INIT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  ts INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  workspace_id TEXT,
  repo_path TEXT,
  file_path TEXT,
  language_id TEXT,
  line_delta INTEGER DEFAULT 0,
  char_delta INTEGER DEFAULT 0,
  is_focus INTEGER DEFAULT 1,
  metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  workspace_id TEXT,
  repo_path TEXT,
  start_ts INTEGER NOT NULL,
  end_ts INTEGER,
  active_ms INTEGER DEFAULT 0,
  idle_ms INTEGER DEFAULT 0,
  total_ms INTEGER DEFAULT 0,
  languages_json TEXT,
  files_touched INTEGER DEFAULT 0,
  closed_reason TEXT
);

CREATE TABLE IF NOT EXISTS hourly_stats (
  id INTEGER PRIMARY KEY,
  date_key TEXT NOT NULL,
  hour INTEGER NOT NULL,
  workspace_id TEXT,
  repo_path TEXT,
  active_ms INTEGER DEFAULT 0,
  idle_ms INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  commit_count INTEGER DEFAULT 0,
  lines_written INTEGER DEFAULT 0,
  productivity_score REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_stats (
  id INTEGER PRIMARY KEY,
  date_key TEXT UNIQUE NOT NULL,
  workspace_id TEXT,
  repo_path TEXT,
  active_ms INTEGER DEFAULT 0,
  idle_ms INTEGER DEFAULT 0,
  total_ms INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  commit_count INTEGER DEFAULT 0,
  lines_written INTEGER DEFAULT 0,
  productivity_score REAL DEFAULT 0,
  goal_status TEXT,
  summary_json TEXT
);

CREATE TABLE IF NOT EXISTS language_stats (
  id INTEGER PRIMARY KEY,
  period_type TEXT NOT NULL,
  period_key TEXT NOT NULL,
  language_id TEXT NOT NULL,
  active_ms INTEGER DEFAULT 0,
  lines_written INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  commit_count INTEGER DEFAULT 0,
  productivity_score REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS monthly_metrics (
  id INTEGER PRIMARY KEY,
  month_key TEXT UNIQUE NOT NULL,
  workspace_id TEXT,
  repo_path TEXT,
  active_ms INTEGER DEFAULT 0,
  idle_ms INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  commit_count INTEGER DEFAULT 0,
  top_language TEXT,
  consistency_score REAL DEFAULT 0,
  growth_json TEXT,
  heatmap_json TEXT
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY,
  date_key TEXT UNIQUE NOT NULL,
  daily_hours REAL NOT NULL,
  daily_commits INTEGER NOT NULL,
  languages_json TEXT NOT NULL,
  line_target INTEGER NOT NULL,
  progress_hours REAL DEFAULT 0,
  progress_commits INTEGER DEFAULT 0,
  progress_lines INTEGER DEFAULT 0,
  status_color TEXT DEFAULT 'yellow',
  completed INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS breaks (
  id INTEGER PRIMARY KEY,
  session_id INTEGER,
  started_ts INTEGER NOT NULL,
  ended_ts INTEGER,
  reminder_level TEXT NOT NULL,
  action TEXT NOT NULL,
  snooze_until_ts INTEGER,
  resolved_reason TEXT
);

CREATE TABLE IF NOT EXISTS git_commits (
  id INTEGER PRIMARY KEY,
  repo_path TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  author_name TEXT,
  author_email TEXT,
  authored_ts INTEGER NOT NULL,
  message TEXT,
  insertions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  files_changed INTEGER DEFAULT 0,
  coauthors_json TEXT
);

CREATE TABLE IF NOT EXISTS aggregation_watermarks (
  id INTEGER PRIMARY KEY,
  pipeline TEXT UNIQUE NOT NULL,
  last_event_id INTEGER,
  last_ts INTEGER,
  updated_ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings_snapshot (
  id INTEGER PRIMARY KEY,
  captured_ts INTEGER NOT NULL,
  pause_tracking INTEGER,
  idle_threshold_min INTEGER,
  excluded_json TEXT
);
`;

export const INDEX_SCHEMA_SQL = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_git_commits_unique ON git_commits(repo_path, commit_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_date_key ON goals(date_key);
CREATE INDEX IF NOT EXISTS idx_events_ts_repo ON events(ts, repo_path);
CREATE INDEX IF NOT EXISTS idx_events_language_ts ON events(language_id, ts);
CREATE INDEX IF NOT EXISTS idx_sessions_start_end ON sessions(start_ts, end_ts);
CREATE INDEX IF NOT EXISTS idx_hourly_date_hour_repo ON hourly_stats(date_key, hour, repo_path);
CREATE INDEX IF NOT EXISTS idx_language_period_lang ON language_stats(period_type, period_key, language_id);
CREATE INDEX IF NOT EXISTS idx_monthly_month_key ON monthly_metrics(month_key);
CREATE INDEX IF NOT EXISTS idx_breaks_snooze_open ON breaks(snooze_until_ts) WHERE ended_ts IS NULL;
`;
