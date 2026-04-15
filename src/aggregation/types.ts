import { DailyStatRecord, HourlyStatRecord, LanguageStatRecord, MonthlyMetricRecord } from "../storage/types";

export interface AggregationContext {
  nowMs: number;
  idleThresholdMs: number;
}

export interface QuarterHourBucket {
  bucketStartTs: number;
  dateKey: string;
  hour: number;
  repoPath?: string;
  workspaceId?: string;
  languageId?: string;
  activeMs: number;
  idleMs: number;
  linesWritten: number;
  eventCount: number;
}

export interface AggregationResult {
  hourly: HourlyStatRecord[];
  daily: DailyStatRecord[];
  language: LanguageStatRecord[];
  monthly: MonthlyMetricRecord[];
  processedEventCount: number;
  lastEventId?: number;
  lastEventTs?: number;
}
