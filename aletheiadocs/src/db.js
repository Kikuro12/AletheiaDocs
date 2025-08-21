import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (!connectionString) {
	console.warn('Warning: DATABASE_PUBLIC_URL or DATABASE_URL is not set. Database features will fail.');
}

export const pool = new Pool({
	connectionString,
	ssl: connectionString && connectionString.includes('railway') ? { rejectUnauthorized: false } : undefined,
});

export async function query(sql, params = []) {
	const client = await pool.connect();
	try {
		const result = await client.query(sql, params);
		return result;
	} finally {
		client.release();
	}
}