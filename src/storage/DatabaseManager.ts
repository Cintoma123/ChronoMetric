import { ChronoMetricStoragePaths } from "../core/types";
import { JsonStoreFallback } from "./JsonStoreFallback";
import { INDEX_SCHEMA_SQL, INIT_SCHEMA_SQL } from "./migrations/sql";
import { PersistenceMode, StorageRow, StorageTable } from "./types";

interface PersistenceAdapter {
  initialize(): Promise<void>;
  insert(table: StorageTable, row: StorageRow): Promise<number>;
  upsert(table: StorageTable, uniqueKeys: string[], row: StorageRow): Promise<number>;
  list<T extends StorageRow>(table: StorageTable): Promise<T[]>;
  getOneBy<T extends StorageRow>(table: StorageTable, where: Partial<StorageRow>): Promise<T | undefined>;
  updateById(table: StorageTable, id: number, patch: Partial<StorageRow>): Promise<boolean>;
  dispose(): void;
}

interface SqliteDatabase {
  run(sql: string, params?: unknown[], callback?: (error: Error | null) => void): void;
  all(sql: string, params: unknown[], callback: (error: Error | null, rows: StorageRow[]) => void): void;
  get(sql: string, params: unknown[], callback: (error: Error | null, row?: StorageRow) => void): void;
  close(callback: (error: Error | null) => void): void;
}

interface SqliteModuleLike {
  verbose?: () => SqliteModuleLike;
  Database: new (filePath: string, callback?: (error: Error | null) => void) => SqliteDatabase;
}

class SqliteStoreAdapter implements PersistenceAdapter {
  private db?: SqliteDatabase;

  public constructor(private readonly databasePath: string) {}

  public static async tryCreate(databasePath: string): Promise<SqliteStoreAdapter | undefined> {
    const moduleRef = SqliteStoreAdapter.tryLoadSqliteModule();
    if (!moduleRef) {
      return undefined;
    }

    const adapter = new SqliteStoreAdapter(databasePath);
    await adapter.open(moduleRef);
    return adapter;
  }

  public async initialize(): Promise<void> {
    await this.exec("PRAGMA journal_mode = WAL;");
    await this.exec("PRAGMA synchronous = NORMAL;");
    await this.exec(INIT_SCHEMA_SQL);
    await this.exec(INDEX_SCHEMA_SQL);
  }

  public async insert(table: StorageTable, row: StorageRow): Promise<number> {
    const keys = Object.keys(row);
    const placeholders = keys.map(() => "?").join(", ");
    const sql = `INSERT INTO ${this.toIdentifier(table)} (${keys.map((key) => this.toIdentifier(key)).join(", ")}) VALUES (${placeholders});`;
    await this.run(sql, keys.map((key) => row[key]));

    const lastRow = await this.getOneBy<{ id: number }>(table, row);
    return Number(lastRow?.id ?? 0);
  }

  public async upsert(table: StorageTable, uniqueKeys: string[], row: StorageRow): Promise<number> {
    const existing = await this.getOneBy<{ id: number }>(
      table,
      uniqueKeys.reduce<Partial<StorageRow>>((accumulator, key) => {
        accumulator[key] = row[key];
        return accumulator;
      }, {})
    );

    if (existing?.id) {
      await this.updateById(table, existing.id, row);
      return existing.id;
    }

    return this.insert(table, row);
  }

  public async list<T extends StorageRow>(table: StorageTable): Promise<T[]> {
    const sql = `SELECT * FROM ${this.toIdentifier(table)};`;
    return this.all<T>(sql, []);
  }

  public async getOneBy<T extends StorageRow>(table: StorageTable, where: Partial<StorageRow>): Promise<T | undefined> {
    const clauses = Object.keys(where).map((key) => `${this.toIdentifier(key)} = ?`);
    const values = Object.keys(where).map((key) => where[key]);

    if (clauses.length === 0) {
      const sql = `SELECT * FROM ${this.toIdentifier(table)} ORDER BY id DESC LIMIT 1;`;
      return this.get<T>(sql, []);
    }

    const sql = `SELECT * FROM ${this.toIdentifier(table)} WHERE ${clauses.join(" AND ")} LIMIT 1;`;
    return this.get<T>(sql, values);
  }

  public async updateById(table: StorageTable, id: number, patch: Partial<StorageRow>): Promise<boolean> {
    const keys = Object.keys(patch);
    if (keys.length === 0) {
      return true;
    }

    const assignments = keys.map((key) => `${this.toIdentifier(key)} = ?`).join(", ");
    const values = keys.map((key) => patch[key]);
    const sql = `UPDATE ${this.toIdentifier(table)} SET ${assignments} WHERE id = ?;`;
    await this.run(sql, [...values, id]);
    return true;
  }

  public dispose(): void {
    const db = this.db;
    this.db = undefined;
    if (!db) {
      return;
    }

    db.close(() => {
      // Best-effort close.
    });
  }

  private static tryLoadSqliteModule(): SqliteModuleLike | undefined {
    try {
      const dynamicRequire = eval("require") as NodeRequire;
      const raw = dynamicRequire("sqlite3") as SqliteModuleLike;
      if (!raw || typeof raw.Database !== "function") {
        return undefined;
      }

      return typeof raw.verbose === "function" ? raw.verbose() : raw;
    } catch {
      return undefined;
    }
  }

  private async open(sqliteModule: SqliteModuleLike): Promise<void> {
    const db = await new Promise<SqliteDatabase>((resolve, reject) => {
      const created = new sqliteModule.Database(this.databasePath, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(created);
      });
    });

    this.db = db;
  }

  private async exec(sql: string): Promise<void> {
    await this.run(sql, []);
  }

  private async run(sql: string, params: unknown[]): Promise<void> {
    const db = this.requireDb();
    await new Promise<void>((resolve, reject) => {
      db.run(sql, params, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private async all<T extends StorageRow>(sql: string, params: unknown[]): Promise<T[]> {
    const db = this.requireDb();
    return new Promise<T[]>((resolve, reject) => {
      db.all(sql, params, (error, rows) => {
        if (error) {
          reject(error);
          return;
        }

        resolve((rows ?? []) as T[]);
      });
    });
  }

  private async get<T extends StorageRow>(sql: string, params: unknown[]): Promise<T | undefined> {
    const db = this.requireDb();
    return new Promise<T | undefined>((resolve, reject) => {
      db.get(sql, params, (error, row) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(row as T | undefined);
      });
    });
  }

  private requireDb(): SqliteDatabase {
    if (!this.db) {
      throw new Error("SQLite database is not initialized.");
    }

    return this.db;
  }

  private toIdentifier(identifier: string): string {
    if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
      throw new Error(`Invalid SQL identifier: ${identifier}`);
    }

    return identifier;
  }
}

export class DatabaseManager {
  private adapter?: PersistenceAdapter;
  private mode: PersistenceMode = "json";

  public constructor(private readonly storagePaths: ChronoMetricStoragePaths) {}

  public async initialize(): Promise<void> {
    const sqliteAdapter = await SqliteStoreAdapter.tryCreate(this.storagePaths.databasePath);

    if (sqliteAdapter) {
      try {
        await sqliteAdapter.initialize();
        this.adapter = sqliteAdapter;
        this.mode = "sqlite";
        return;
      } catch (error) {
        sqliteAdapter.dispose();
        console.warn("ChronoMetric: SQLite initialization failed, falling back to JSON store.", error);
      }
    }

    const fallback = new JsonStoreFallback(this.storagePaths.baseDir);
    await fallback.initialize();
    this.adapter = fallback;
    this.mode = "json";
  }

  public getMode(): PersistenceMode {
    return this.mode;
  }

  public async insert(table: StorageTable, row: StorageRow): Promise<number> {
    return this.requireAdapter().insert(table, row);
  }

  public async upsert(table: StorageTable, uniqueKeys: string[], row: StorageRow): Promise<number> {
    return this.requireAdapter().upsert(table, uniqueKeys, row);
  }

  public async list<T extends StorageRow>(table: StorageTable): Promise<T[]> {
    return this.requireAdapter().list<T>(table);
  }

  public async getOneBy<T extends StorageRow>(table: StorageTable, where: Partial<StorageRow>): Promise<T | undefined> {
    return this.requireAdapter().getOneBy<T>(table, where);
  }

  public async updateById(table: StorageTable, id: number, patch: Partial<StorageRow>): Promise<boolean> {
    return this.requireAdapter().updateById(table, id, patch);
  }

  public dispose(): void {
    this.adapter?.dispose();
    this.adapter = undefined;
  }

  private requireAdapter(): PersistenceAdapter {
    if (!this.adapter) {
      throw new Error("DatabaseManager used before initialization.");
    }

    return this.adapter;
  }
}
