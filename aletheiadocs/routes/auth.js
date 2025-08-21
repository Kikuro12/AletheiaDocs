import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../src/db.js';

const router = express.Router();

router.get('/register', (req, res) => {
	if (req.session.user) return res.redirect('/');
	res.render('auth/register', { title: 'Magrehistro' });
});

router.post('/register', async (req, res) => {
	const { username, email, password } = req.body;
	if (!username || !email || !password) return res.redirect('/auth/register');
	const client = await pool.connect();
	try {
		const hash = await bcrypt.hash(password, 10);
		const { rows } = await client.query(
			'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, is_admin',
			[username.trim(), email.trim(), hash]
		);
		req.session.user = rows[0];
		res.redirect('/');
	} catch (e) {
		res.redirect('/auth/register');
	} finally {
		client.release();
	}
});

router.get('/login', (req, res) => {
	if (req.session.user) return res.redirect('/');
	res.render('auth/login', { title: 'Mag-login' });
});

router.post('/login', async (req, res) => {
	const { email, password } = req.body;
	const client = await pool.connect();
	try {
		const { rows } = await client.query('SELECT id, username, email, password_hash, is_admin FROM users WHERE email=$1', [email]);
		if (!rows.length) return res.redirect('/auth/login');
		const user = rows[0];
		const ok = await bcrypt.compare(password, user.password_hash);
		if (!ok) return res.redirect('/auth/login');
		req.session.user = { id: user.id, username: user.username, is_admin: user.is_admin };
		res.redirect('/');
	} finally {
		client.release();
	}
});

router.post('/logout', (req, res) => {
	req.session.destroy(() => {
		res.redirect('/');
	});
});

export default router;