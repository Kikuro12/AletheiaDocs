import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import helmet from 'helmet';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import ejsMate from 'ejs-mate';

import { pool } from './src/db.js';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';
import documentsRouter from './routes/documents.js';
import forumRouter from './routes/forum.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

// Security and parsing
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessions
const PgSession = connectPgSimple(session);
const sessionMiddleware = session({
	store: new PgSession({
		pool,
		tableName: 'session',
	}),
	secret: process.env.SESSION_SECRET || 'dev_secret',
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: process.env.NODE_ENV === 'production',
		maxAge: 1000 * 60 * 60 * 24 * 7,
	},
});
app.use(sessionMiddleware);

// Share session with Socket.IO
io.engine.use((req, res, next) => {
	sessionMiddleware(req, res, next);
});

// Static and view engine
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Inject user into views
app.use((req, res, next) => {
	res.locals.currentUser = req.session.user || null;
	next();
});

// Home
app.get('/', async (req, res) => {
	const client = await pool.connect();
	try {
		const { rows: announcements } = await client.query(
			'SELECT id, title, body, icon, created_at FROM announcements ORDER BY created_at DESC LIMIT 3'
		);
		res.render('index', { title: 'AletheiaDocs', announcements });
	} finally {
		client.release();
	}
});

// Routers
app.use('/api', apiRouter);
app.use('/auth', authRouter);
app.use('/documents', documentsRouter);
app.use('/forum', forumRouter);
app.use('/admin', adminRouter);

// Socket.IO Chat
io.on('connection', (socket) => {
	const req = socket.request;
	const user = req.session?.user || { id: null, username: 'Bisita' };

	socket.on('chat:message', async (message) => {
		const trimmed = String(message || '').trim();
		if (!trimmed) return;
		const client = await pool.connect();
		try {
			await client.query(
				'INSERT INTO chat_messages (user_id, username_snapshot, message) VALUES ($1, $2, $3)'
				, [user.id, user.username || 'Bisita', trimmed]
			);
		} finally {
			client.release();
		}
		io.emit('chat:message', {
			username: user.username || 'Bisita',
			message: trimmed,
			created_at: new Date().toISOString(),
		});
	});
});

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`AletheiaDocs listening on port ${PORT}`);
});