import { HourlyStatRecord } from "../storage/types";
import { QuarterHourBucket } from "./types";

export class HourlyAggregator {
  public aggregate(buckets: QuarterHourBucket[], commitTimestampsMs: number[]): HourlyStatRecord[] {
    const grouped = new Map<string, HourlyStatRecord>();

    for (const bucket of buckets) {
      const key = [bucket.dateKey, bucket.hour, bucket.repoPath ?? ""].join("|");
      const existing = grouped.get(key) ?? {
        date_key: bucket.dateKey,
        hour: bucket.hour,
        workspace_id: bucket.workspaceId,
        repo_path: bucket.repoPath,
        active_ms: 0,
        idle_ms: 0,
        session_count: 0,
        commit_count: 0,
        lines_written: 0,
        productivity_score: 0
      };

      existing.active_ms = Number(existing.active_ms ?? 0) + bucket.activeMs;
      existing.idle_ms = Number(existing.idle_ms ?? 0) + bucket.idleMs;
      existing.lines_written = Number(existing.lines_written ?? 0) + bucket.linesWritten;
      grouped.set(key, existing);
    }

    for (const stat of grouped.values()) {
      const dateStart = new Date(`${stat.date_key}T00:00:00`).getTime();
      const hourStart = dateStart + stat.hour * 60 * 60 * 1000;
      const hourEnd = hourStart + 60 * 60 * 1000;
      stat.commit_count = commitTimestampsMs.filter((ts) => ts >= hourStart && ts < hourEnd).length;

      const active = Number(stat.active_ms ?? 0);
      const idle = Number(stat.idle_ms ?? 0);
      stat.productivity_score = active / Math.max(active + idle, 1);
    }

    return Array.from(grouped.values());
  }
}
