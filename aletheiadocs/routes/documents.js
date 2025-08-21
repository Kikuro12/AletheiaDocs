import express from 'express';
import multer from 'multer';
import path from 'path';
import { pool } from '../src/db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = express.Router();

const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads')),
	filename: (req, file, cb) => {
		const safe = Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
		cb(null, safe);
	}
});

const upload = multer({ storage });

router.get('/', async (req, res) => {
	const { category, q } = req.query;
	const client = await pool.connect();
	try {
		const cats = await client.query('SELECT id, name, slug FROM categories ORDER BY name');
		const params = [];
		let where = 'WHERE d.is_published = TRUE';
		if (category) {
			params.push(category);
			where += ` AND c.slug = $${params.length}`;
		}
		if (q) {
			params.push(`%${q}%`);
			where += ` AND (d.title ILIKE $${params.length} OR d.description ILIKE $${params.length})`;
		}
		const docs = await client.query(
			`SELECT d.id, d.title, d.description, d.file_path, d.file_mime, d.created_at, c.name AS category, c.slug
			 FROM documents d LEFT JOIN categories c ON c.id=d.category_id ${where} ORDER BY d.created_at DESC LIMIT 100`,
			params
		);
		res.render('documents/index', { title: 'Mga Dokumento', documents: docs.rows, categories: cats.rows, activeCategory: category || '', search: q || '' });
	} finally {
		client.release();
	}
});

router.get('/:id/download', async (req, res) => {
	const id = req.params.id;
	const client = await pool.connect();
	try {
		const { rows } = await client.query('SELECT file_path, file_mime, title FROM documents WHERE id=$1 AND is_published=TRUE', [id]);
		if (!rows.length) return res.status(404).send('Not found');
		const doc = rows[0];
		res.type(doc.file_mime || 'application/pdf');
		res.setHeader('Content-Disposition', `inline; filename="${doc.title.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf"`);
		res.sendFile(path.resolve(doc.file_path));
	} finally {
		client.release();
	}
});

router.get('/admin/upload', requireAdmin, async (req, res) => {
	const { rows: categories } = await pool.query('SELECT id, name, slug FROM categories ORDER BY name');
	res.render('documents/upload', { title: 'Mag-upload', categories });
});

router.post('/admin/upload', requireAdmin, upload.single('file'), async (req, res) => {
	const { title, description, category_id } = req.body;
	const filePath = req.file.path;
	const fileMime = req.file.mimetype;
	await pool.query(
		'INSERT INTO documents (title, description, category_id, file_path, file_mime, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6)',
		[title, description, category_id || null, filePath, fileMime, req.session.user?.id || null]
	);
	res.redirect('/documents');
});

export default router;