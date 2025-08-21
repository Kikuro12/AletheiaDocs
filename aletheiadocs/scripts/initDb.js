import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
	const sqlPath = path.join(__dirname, 'init_db.sql');
	const sql = fs.readFileSync(sqlPath, 'utf-8');
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		await client.query(sql);
		await client.query('COMMIT');
		console.log('Database initialized.');
	} catch (err) {
		await client.query('ROLLBACK');
		console.error('Database init failed:', err);
		process.exitCode = 1;
	} finally {
		client.release();
		await pool.end();
	}
}

run();