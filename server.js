import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || undefined,
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4',
  multipleStatements: false,
  connectTimeout: 10000,
};

const pool = mysql.createPool(config);
const app = express();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public')));

function quoteId(id) {
  return '`' + String(id).replace(/`/g, '``') + '`';
}

const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api/health', handle(async (_req, res) => {
  const [rows] = await pool.query('SELECT VERSION() AS version');
  res.json({ ok: true, version: rows[0].version, host: config.host, port: config.port });
}));

app.get('/api/databases', handle(async (_req, res) => {
  const [rows] = await pool.query('SHOW DATABASES');
  res.json(rows.map((r) => Object.values(r)[0]));
}));

app.get('/api/databases/:db/tables', handle(async (req, res) => {
  const [rows] = await pool.query(`SHOW TABLES FROM ${quoteId(req.params.db)}`);
  res.json(rows.map((r) => Object.values(r)[0]));
}));

app.get('/api/databases/:db/tables/:table/columns', handle(async (req, res) => {
  const [rows] = await pool.query(
    `SHOW COLUMNS FROM ${quoteId(req.params.table)} FROM ${quoteId(req.params.db)}`,
  );
  res.json(rows);
}));

app.get('/api/databases/:db/tables/:table/rows', handle(async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit ?? '50', 10) || 50, 1), 500);
  const offset = Math.max(Number.parseInt(req.query.offset ?? '0', 10) || 0, 0);
  const target = `${quoteId(req.params.db)}.${quoteId(req.params.table)}`;

  const [rows] = await pool.query(
    `SELECT * FROM ${target} LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM ${target}`);
  res.json({ rows, total: Number(countRows[0].total), limit, offset });
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.code || 'ERROR', message: err.sqlMessage || err.message });
});

app.listen(port, () => {
  console.log(`subexplorer listening on http://localhost:${port}`);
  console.log(`target mysql ${config.host}:${config.port} as ${config.user}`);
});
