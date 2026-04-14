export type AggregationMode = "lazy" | "incremental";

export interface ChronoMetricConfig {
  pauseTracking: boolean;
  idleThresholdMinutes: number;
  excludedGlobs: string[];
  excludedRepos: string[];
  aggregationMode: AggregationMode;
  gitPollingMinutes: number;
}

export interface ChronoMetricStoragePaths {
  baseDir: string;
  databasePath: string;
  logsDir: string;
}

export interface DisposableService {
  dispose(): void;
}
