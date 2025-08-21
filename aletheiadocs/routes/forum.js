import express from 'express';
import { pool } from '../src/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
	const { rows: posts } = await pool.query(
		`SELECT p.id, p.title, p.created_at, p.is_pinned, p.is_locked, u.username
		 FROM forum_posts p LEFT JOIN users u ON u.id=p.user_id
		 ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT 50`
	);
	res.render('forum/index', { title: 'Talakayan', posts });
});

router.get('/new', requireAuth, (req, res) => {
	res.render('forum/new', { title: 'Bagong Talakayan' });
});

router.post('/new', requireAuth, async (req, res) => {
	const { title, body } = req.body;
	const userId = req.session.user.id;
	const { rows } = await pool.query(
		'INSERT INTO forum_posts (user_id, title, body) VALUES ($1, $2, $3) RETURNING id',
		[userId, title, body]
	);
	res.redirect(`/forum/${rows[0].id}`);
});

router.get('/:id', async (req, res) => {
	const id = req.params.id;
	const client = await pool.connect();
	try {
		const { rows: posts } = await client.query(
			`SELECT p.id, p.title, p.body, p.is_locked, p.created_at, u.username
			 FROM forum_posts p LEFT JOIN users u ON u.id=p.user_id WHERE p.id=$1`, [id]
		);
		if (!posts.length) return res.status(404).send('Not found');
		const { rows: replies } = await client.query(
			`SELECT r.id, r.body, r.created_at, r.is_deleted, u.username
			 FROM forum_replies r LEFT JOIN users u ON u.id=r.user_id
			 WHERE r.post_id=$1 ORDER BY r.created_at ASC`, [id]
		);
		res.render('forum/show', { title: posts[0].title, post: posts[0], replies });
	} finally {
		client.release();
	}
});

router.post('/:id/replies', requireAuth, async (req, res) => {
	const id = req.params.id;
	const { body } = req.body;
	const userId = req.session.user.id;
	await pool.query('INSERT INTO forum_replies (post_id, user_id, body) VALUES ($1, $2, $3)', [id, userId, body]);
	res.redirect(`/forum/${id}`);
});

router.post('/:id/lock', requireAdmin, async (req, res) => {
	await pool.query('UPDATE forum_posts SET is_locked=TRUE WHERE id=$1', [req.params.id]);
	res.redirect(`/forum/${req.params.id}`);
});

router.post('/:id/pin', requireAdmin, async (req, res) => {
	await pool.query('UPDATE forum_posts SET is_pinned=TRUE WHERE id=$1', [req.params.id]);
	res.redirect(`/forum/${req.params.id}`);
});

export default router;