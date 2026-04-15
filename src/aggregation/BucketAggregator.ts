import { TrackedEventRecord } from "../storage/types";
import { AggregationContext, QuarterHourBucket } from "./types";

function toDateKey(ts: number): string {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function floorToQuarterHour(ts: number): number {
  const quarterMs = 15 * 60 * 1000;
  return Math.floor(ts / quarterMs) * quarterMs;
}

export class BucketAggregator {
  public aggregate(events: TrackedEventRecord[], context: AggregationContext): QuarterHourBucket[] {
    const sorted = [...events]
      .filter((event) => typeof event.ts === "number")
      .sort((left, right) => left.ts - right.ts);

    const buckets = new Map<string, QuarterHourBucket>();

    for (let index = 0; index < sorted.length; index += 1) {
      const current = sorted[index];
      if (!current) {
        continue;
      }

      const next = sorted[index + 1];

      const bucketStartTs = floorToQuarterHour(current.ts);
      const dateKey = toDateKey(current.ts);
      const hour = new Date(current.ts).getHours();
      const key = [bucketStartTs, current.repo_path ?? "", current.language_id ?? ""].join("|");

      const existing = buckets.get(key) ?? {
        bucketStartTs,
        dateKey,
        hour,
        repoPath: current.repo_path,
        workspaceId: current.workspace_id,
        languageId: current.language_id,
        activeMs: 0,
        idleMs: 0,
        linesWritten: 0,
        eventCount: 0
      };

      const gapMs = next ? Math.max(0, next.ts - current.ts) : 0;
      const activeMs = Math.min(gapMs, context.idleThresholdMs);
      const idleMs = Math.max(0, gapMs - activeMs);

      existing.activeMs += activeMs;
      existing.idleMs += idleMs;
      existing.linesWritten += Math.max(0, Number(current.line_delta ?? 0));
      existing.eventCount += 1;

      buckets.set(key, existing);
    }

    return Array.from(buckets.values());
  }
}
