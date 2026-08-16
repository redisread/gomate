import type Database from "better-sqlite3";

type FakeD1Result = {
  success: true;
  results: unknown[];
  meta: { changes: number; last_row_id: number | bigint };
};

class ContentPreparedStatement {
  private values: unknown[] = [];
  private beforeExecute: (() => void) | null;

  constructor(
    private readonly sqlite: Database.Database,
    private readonly query: string,
    beforeExecute?: () => void,
  ) {
    this.beforeExecute = beforeExecute ?? null;
  }

  bind(...values: unknown[]): ContentPreparedStatement {
    this.values = values;
    return this;
  }

  execute(): FakeD1Result {
    this.beforeExecute?.();
    this.beforeExecute = null;
    const result = this.sqlite.prepare(this.query).run(...this.values);
    return {
      success: true,
      results: [],
      meta: {
        changes: result.changes,
        last_row_id: result.lastInsertRowid,
      },
    };
  }

  async run(): Promise<FakeD1Result> {
    return this.execute();
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    this.beforeExecute?.();
    this.beforeExecute = null;
    return (this.sqlite.prepare(this.query).get(...this.values) as T | undefined) ?? null;
  }

  async all<T = Record<string, unknown>>(): Promise<{
    success: true;
    results: T[];
    meta: { changes: number; last_row_id: number };
  }> {
    this.beforeExecute?.();
    this.beforeExecute = null;
    return {
      success: true,
      results: this.sqlite.prepare(this.query).all(...this.values) as T[],
      meta: { changes: 0, last_row_id: 0 },
    };
  }
}

/**
 * Minimal D1 write adapter backed by the same SQLite connection as createTestDb.
 * It exercises production prepare/bind/batch calls and preserves D1 batch rollback.
 */
export class ContentD1Database {
  beforeNextBatch: (() => void) | null = null;
  beforeNextRun: (() => void) | null = null;
  failNextBatch: Error | null = null;
  failNextRun: Error | null = null;

  constructor(private readonly sqlite: Database.Database) {}

  prepare(query: string): ContentPreparedStatement {
    const beforeExecute = this.beforeNextRun ?? undefined;
    this.beforeNextRun = null;
    const statement = new ContentPreparedStatement(
      this.sqlite,
      query,
      beforeExecute,
    );
    if (!this.failNextRun) return statement;

    const failure = this.failNextRun;
    this.failNextRun = null;
    return {
      bind: (..._values: unknown[]) => ({
        run: async () => {
          throw failure;
        },
      }),
    } as unknown as ContentPreparedStatement;
  }

  async batch(statements: ContentPreparedStatement[]): Promise<FakeD1Result[]> {
    this.beforeNextBatch?.();
    this.beforeNextBatch = null;
    if (this.failNextBatch) {
      const failure = this.failNextBatch;
      this.failNextBatch = null;
      throw failure;
    }

    this.sqlite.exec("BEGIN");
    try {
      const results = statements.map((statement) => statement.execute());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}
