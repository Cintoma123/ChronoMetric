import * as fs from "fs/promises";
import * as path from "path";
import { StorageRow, StorageTable } from "./types";

interface JsonDatabaseShape {
  tables: Record<StorageTable, StorageRow[]>;
  counters: Record<StorageTable, number>;
}

function createEmptyDatabase(): JsonDatabaseShape {
  const tables: Record<StorageTable, StorageRow[]> = {
    events: [],
    sessions: [],
    hourly_stats: [],
    daily_stats: [],
    language_stats: [],
    monthly_metrics: [],
    goals: [],
    breaks: [],
    git_commits: [],
    aggregation_watermarks: [],
    settings_snapshot: []
  };

  const counters: Record<StorageTable, number> = {
    events: 1,
    sessions: 1,
    hourly_stats: 1,
    daily_stats: 1,
    language_stats: 1,
    monthly_metrics: 1,
    goals: 1,
    breaks: 1,
    git_commits: 1,
    aggregation_watermarks: 1,
    settings_snapshot: 1
  };

  return { tables, counters };
}

export class JsonStoreFallback {
  private readonly filePath: string;
  private db: JsonDatabaseShape = createEmptyDatabase();

  public constructor(baseDir: string) {
    this.filePath = path.join(baseDir, "chronometric.fallback.json");
  }

  public async initialize(): Promise<void> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<JsonDatabaseShape>;
      const empty = createEmptyDatabase();
      this.db = {
        tables: {
          ...empty.tables,
          ...(parsed.tables ?? {})
        },
        counters: {
          ...empty.counters,
          ...(parsed.counters ?? {})
        }
      };
    } catch {
      this.db = createEmptyDatabase();
      await this.flush();
    }
  }

  public async insert(table: StorageTable, row: StorageRow): Promise<number> {
    const id = this.db.counters[table]++;
    const nextRow = { ...row, id };
    this.db.tables[table].push(nextRow);
    await this.flush();
    return id;
  }

  public async upsert(table: StorageTable, uniqueKeys: string[], row: StorageRow): Promise<number> {
    const existingIndex = this.db.tables[table].findIndex((candidate) =>
      uniqueKeys.every((key) => candidate[key] === row[key])
    );

    if (existingIndex >= 0) {
      const existing = this.db.tables[table][existingIndex];
      if (!existing || typeof existing.id !== "number") {
        throw new Error(`Corrupt fallback row in table ${table}: missing numeric id.`);
      }

      const merged = { ...existing, ...row, id: existing.id };
      this.db.tables[table][existingIndex] = merged;
      await this.flush();
      return Number(existing.id);
    }

    return this.insert(table, row);
  }

  public async list<T extends StorageRow>(table: StorageTable): Promise<T[]> {
    const rows = this.db.tables[table].map((row) => ({ ...row }));
    return rows as T[];
  }

  public async getOneBy<T extends StorageRow>(table: StorageTable, where: Partial<StorageRow>): Promise<T | undefined> {
    const candidate = this.db.tables[table].find((row) =>
      Object.entries(where).every(([key, value]) => row[key] === value)
    );

    return candidate ? ({ ...candidate } as T) : undefined;
  }

  public async updateById(table: StorageTable, id: number, patch: Partial<StorageRow>): Promise<boolean> {
    const index = this.db.tables[table].findIndex((row) => row.id === id);
    if (index < 0) {
      return false;
    }

    const current = this.db.tables[table][index];
    if (!current) {
      return false;
    }

    this.db.tables[table][index] = { ...current, ...patch, id: current.id };
    await this.flush();
    return true;
  }

  public dispose(): void {
    // No live handles to release for JSON storage.
  }

  private async flush(): Promise<void> {
    const serialized = JSON.stringify(this.db, null, 2);
    await fs.writeFile(this.filePath, serialized, "utf8");
  }
}
