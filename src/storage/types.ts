export type PersistenceMode = "sqlite" | "json";

export type StorageTable =
  | "events"
  | "sessions"
  | "hourly_stats"
  | "daily_stats"
  | "language_stats"
  | "monthly_metrics"
  | "goals"
  | "breaks"
  | "git_commits"
  | "aggregation_watermarks"
  | "settings_snapshot";

export interface StorageRow {
  id?: number;
  [key: string]: unknown;
}

export interface TrackedEventRecord extends StorageRow {
  ts: number;
  event_type: string;
  workspace_id?: string;
  repo_path?: string;
  file_path?: string;
  language_id?: string;
  line_delta?: number;
  char_delta?: number;
  is_focus?: number;
  metadata_json?: string;
}

export interface SessionRecord extends StorageRow {
  workspace_id?: string;
  repo_path?: string;
  start_ts: number;
  end_ts?: number;
  active_ms?: number;
  idle_ms?: number;
  total_ms?: number;
  languages_json?: string;
  files_touched?: number;
  closed_reason?: string;
}

export interface HourlyStatRecord extends StorageRow {
  date_key: string;
  hour: number;
  workspace_id?: string;
  repo_path?: string;
  active_ms?: number;
  idle_ms?: number;
  session_count?: number;
  commit_count?: number;
  lines_written?: number;
  productivity_score?: number;
}

export interface DailyStatRecord extends StorageRow {
  date_key: string;
  workspace_id?: string;
  repo_path?: string;
  active_ms?: number;
  idle_ms?: number;
  total_ms?: number;
  session_count?: number;
  commit_count?: number;
  lines_written?: number;
  productivity_score?: number;
  goal_status?: string;
  summary_json?: string;
}

export interface LanguageStatRecord extends StorageRow {
  period_type: string;
  period_key: string;
  language_id: string;
  active_ms?: number;
  lines_written?: number;
  session_count?: number;
  commit_count?: number;
  productivity_score?: number;
}

export interface MonthlyMetricRecord extends StorageRow {
  month_key: string;
  workspace_id?: string;
  repo_path?: string;
  active_ms?: number;
  idle_ms?: number;
  session_count?: number;
  commit_count?: number;
  top_language?: string;
  consistency_score?: number;
  growth_json?: string;
  heatmap_json?: string;
}

export interface GoalRecord extends StorageRow {
  date_key: string;
  daily_hours: number;
  daily_commits: number;
  languages_json: string;
  line_target: number;
  progress_hours?: number;
  progress_commits?: number;
  progress_lines?: number;
  status_color?: string;
  completed?: number;
  streak_count?: number;
}

export interface BreakRecord extends StorageRow {
  session_id?: number;
  started_ts: number;
  ended_ts?: number;
  reminder_level: string;
  action: string;
  snooze_until_ts?: number;
  resolved_reason?: string;
}

export interface GitCommitRecord extends StorageRow {
  repo_path: string;
  commit_hash: string;
  author_name?: string;
  author_email?: string;
  authored_ts: number;
  message?: string;
  insertions?: number;
  deletions?: number;
  files_changed?: number;
  coauthors_json?: string;
}

export interface AggregationWatermarkRecord extends StorageRow {
  pipeline: string;
  last_event_id?: number;
  last_ts?: number;
  updated_ts: number;
}

export interface SettingsSnapshotRecord extends StorageRow {
  captured_ts: number;
  pause_tracking?: number;
  idle_threshold_min?: number;
  excluded_json?: string;
}
