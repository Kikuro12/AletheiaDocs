import express from 'express';
import { pool } from '../src/db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
	const { rows: announcements } = await pool.query('SELECT id, title, icon, created_at FROM announcements ORDER BY created_at DESC');
	res.render('admin/index', { title: 'Admin', announcements });
});

router.get('/announcements/new', requireAdmin, (req, res) => {
	res.render('admin/announcement_new', { title: 'Bagong Anunsyo' });
});

router.post('/announcements', requireAdmin, async (req, res) => {
	const { title, body, icon } = req.body;
	await pool.query('INSERT INTO announcements (title, body, icon) VALUES ($1, $2, $3)', [title, body, icon]);
	res.redirect('/admin');
});

router.post('/chat/:id/hide', requireAdmin, async (req, res) => {
	await pool.query('UPDATE chat_messages SET is_hidden=TRUE WHERE id=$1', [req.params.id]);
	res.redirect('/admin');
});

router.post('/forum/replies/:id/delete', requireAdmin, async (req, res) => {
	await pool.query('UPDATE forum_replies SET is_deleted=TRUE WHERE id=$1', [req.params.id]);
	res.redirect('back');
});

export default router;