CREATE UNIQUE INDEX IF NOT EXISTS idx_git_commits_unique ON git_commits(repo_path, commit_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_date_key ON goals(date_key);
CREATE INDEX IF NOT EXISTS idx_events_ts_repo ON events(ts, repo_path);
CREATE INDEX IF NOT EXISTS idx_events_language_ts ON events(language_id, ts);
CREATE INDEX IF NOT EXISTS idx_sessions_start_end ON sessions(start_ts, end_ts);
CREATE INDEX IF NOT EXISTS idx_hourly_date_hour_repo ON hourly_stats(date_key, hour, repo_path);
CREATE INDEX IF NOT EXISTS idx_language_period_lang ON language_stats(period_type, period_key, language_id);
CREATE INDEX IF NOT EXISTS idx_monthly_month_key ON monthly_metrics(month_key);
CREATE INDEX IF NOT EXISTS idx_breaks_snooze_open ON breaks(snooze_until_ts) WHERE ended_ts IS NULL;
