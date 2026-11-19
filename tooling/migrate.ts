import { openDatabase } from '../modules/storage/database.js';
import { migrate } from '../modules/storage/migrate.js';

const pool = openDatabase(process.env.DATABASE_URL ?? 'postgres://hexagon@127.0.0.1:55432/hexagon');
try { await migrate(pool); console.log('Database migrations applied.'); } finally { await pool.end(); }
