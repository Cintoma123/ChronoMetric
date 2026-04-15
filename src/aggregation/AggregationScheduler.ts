import * as vscode from "vscode";
import { ConfigService } from "../core/config/ConfigService";
import { PersistenceService } from "../storage/PersistenceService";
import { BucketAggregator } from "./BucketAggregator";
import { DailyMonthlyAggregator } from "./DailyMonthlyAggregator";
import { HourlyAggregator } from "./HourlyAggregator";
import { AggregationContext, AggregationResult } from "./types";

const WATERMARK_PIPELINE = "core.rollup";

export class AggregationScheduler implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private timer?: NodeJS.Timeout;

  private readonly bucketAggregator = new BucketAggregator();
  private readonly hourlyAggregator = new HourlyAggregator();
  private readonly dailyMonthlyAggregator = new DailyMonthlyAggregator();

  public constructor(
    private readonly configService: ConfigService,
    private readonly persistenceService: PersistenceService
  ) {}

  public async start(): Promise<void> {
    await this.runAggregation();
    this.schedule();

    this.disposables.push(
      this.configService.onDidChange(() => {
        this.schedule();
      })
    );
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  public async runAggregation(): Promise<AggregationResult> {
    const config = this.configService.getSnapshot();
    const nowMs = Date.now();
    const context: AggregationContext = {
      nowMs,
      idleThresholdMs: config.idleThresholdMinutes * 60 * 1000
    };

    const watermark = await this.persistenceService.stats.getWatermark(WATERMARK_PIPELINE);
    const lastEventId = Number(watermark?.last_event_id ?? 0);

    const allEvents = await this.persistenceService.events.listAll();
    const allCommits = await this.persistenceService.gitCommits.listAll();

    const newEvents = allEvents.filter((event) => Number(event.id ?? 0) > lastEventId);

    const buckets = this.bucketAggregator.aggregate(newEvents, context);
    const commitTs = allCommits.map((commit) => Number(commit.authored_ts ?? 0));
    const hourly = this.hourlyAggregator.aggregate(buckets, commitTs);
    const daily = this.dailyMonthlyAggregator.aggregateDaily(hourly);
    const language = this.dailyMonthlyAggregator.aggregateLanguage(buckets);
    const monthly = this.dailyMonthlyAggregator.aggregateMonthly(daily, language);

    for (const row of hourly) {
      await this.persistenceService.stats.upsertHourly(row);
    }
    for (const row of daily) {
      await this.persistenceService.stats.upsertDaily(row);
    }
    for (const row of language) {
      await this.persistenceService.stats.upsertLanguage(row);
    }
    for (const row of monthly) {
      await this.persistenceService.stats.upsertMonthly(row);
    }

    const maxEventId = newEvents.reduce((max, row) => Math.max(max, Number(row.id ?? 0)), lastEventId);
    const maxEventTs = newEvents.reduce((max, row) => Math.max(max, Number(row.ts ?? 0)), Number(watermark?.last_ts ?? 0));

    await this.persistenceService.stats.upsertWatermark({
      pipeline: WATERMARK_PIPELINE,
      last_event_id: maxEventId,
      last_ts: maxEventTs,
      updated_ts: nowMs
    });

    return {
      hourly,
      daily,
      language,
      monthly,
      processedEventCount: newEvents.length,
      lastEventId: maxEventId,
      lastEventTs: maxEventTs
    };
  }

  private schedule(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    const config = this.configService.getSnapshot();
    const intervalMs = config.aggregationMode === "incremental" ? 60 * 1000 : 5 * 60 * 1000;
    this.timer = setInterval(() => {
      void this.runAggregation();
    }, intervalMs);
  }
}
