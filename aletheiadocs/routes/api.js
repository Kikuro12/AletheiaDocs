import express from 'express';
import { pool } from '../src/db.js';

const router = express.Router();

router.get('/weather', async (req, res) => {
	const q = (req.query.q || '').toString();
	if (!q) return res.status(400).json({ error: 'Missing q' });
	try {
		const apiKey = process.env.OPENWEATHER_API_KEY;
		const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)},PH&appid=${apiKey}&units=metric`;
		const r = await fetch(url);
		const data = await r.json();
		res.json(data);
	} catch (e) {
		res.status(500).json({ error: 'Weather fetch failed' });
	}
});

router.get('/search', async (req, res) => {
	const q = (req.query.q || '').toString().trim();
	const client = await pool.connect();
	try {
		const { rows } = await client.query(
			`SELECT d.id, d.title, d.description, c.name AS category
			 FROM documents d
			 LEFT JOIN categories c ON c.id = d.category_id
			 WHERE d.is_published = TRUE AND (d.title ILIKE $1 OR d.description ILIKE $1)
			 ORDER BY d.created_at DESC LIMIT 25`, [`%${q}%`]
		);
		res.json({ results: rows });
	} finally {
		client.release();
	}
});

export default router;