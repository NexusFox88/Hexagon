import pg from 'pg';

export function openDatabase(url: string) {
  return new pg.Pool({ connectionString: url, max: 10, connectionTimeoutMillis:10000 });
}
export async function transaction<T>(pool: pg.Pool, work: (db: pg.PoolClient) => Promise<T>): Promise<T> {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const result = await work(db);
    await db.query('COMMIT');
    return result;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}
