/**
 * Wrapper for D1 database operations
 * Provides a thin abstraction layer over D1Database
 */
export class DatabaseClient {
  constructor(private db: D1Database) {}

  /**
   * Prepare a SQL statement
   */
  prepare(query: string): D1PreparedStatement {
    return this.db.prepare(query)
  }

  /**
   * Execute multiple statements in a batch (atomic transaction)
   */
  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    return this.db.batch(statements)
  }

  /**
   * Get the underlying D1Database instance
   */
  getDB(): D1Database {
    return this.db
  }
}
