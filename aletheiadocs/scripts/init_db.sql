-- Core tables
CREATE TABLE IF NOT EXISTS users (
	id SERIAL PRIMARY KEY,
	username TEXT UNIQUE NOT NULL,
	email TEXT UNIQUE NOT NULL,
	password_hash TEXT NOT NULL,
	is_admin BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist if table pre-existed
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name='users' AND column_name='username'
	) THEN
		ALTER TABLE users ADD COLUMN username TEXT;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name='users' AND column_name='email'
	) THEN
		ALTER TABLE users ADD COLUMN email TEXT;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name='users' AND column_name='password_hash'
	) THEN
		ALTER TABLE users ADD COLUMN password_hash TEXT;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name='users' AND column_name='is_admin'
	) THEN
		ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name='users' AND column_name='created_at'
	) THEN
		ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
	END IF;
END $$;

-- Unique indexes if missing (safer than constraints for existing data)
CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);

CREATE TABLE IF NOT EXISTS categories (
	id SERIAL PRIMARY KEY,
	name TEXT UNIQUE NOT NULL,
	slug TEXT UNIQUE NOT NULL
);

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='slug'
	) THEN
		ALTER TABLE categories ADD COLUMN slug TEXT;
	END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_key ON categories (slug);

CREATE TABLE IF NOT EXISTS documents (
	id SERIAL PRIMARY KEY,
	title TEXT NOT NULL,
	description TEXT,
	category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
	file_path TEXT NOT NULL,
	file_mime TEXT,
	uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
	is_published BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='is_published'
	) THEN
		ALTER TABLE documents ADD COLUMN is_published BOOLEAN DEFAULT TRUE;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='created_at'
	) THEN
		ALTER TABLE documents ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
	END IF;
END $$;

CREATE TABLE IF NOT EXISTS announcements (
	id SERIAL PRIMARY KEY,
	title TEXT NOT NULL,
	body TEXT NOT NULL,
	icon TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='title'
	) THEN
		ALTER TABLE announcements ADD COLUMN title TEXT;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='body'
	) THEN
		ALTER TABLE announcements ADD COLUMN body TEXT;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='icon'
	) THEN
		ALTER TABLE announcements ADD COLUMN icon TEXT;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='created_at'
	) THEN
		ALTER TABLE announcements ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='updated_at'
	) THEN
		ALTER TABLE announcements ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
	END IF;
END $$;

CREATE TABLE IF NOT EXISTS forum_posts (
	id SERIAL PRIMARY KEY,
	user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
	title TEXT NOT NULL,
	body TEXT NOT NULL,
	is_pinned BOOLEAN DEFAULT FALSE,
	is_locked BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns WHERE table_name='forum_posts' AND column_name='is_pinned'
	) THEN
		ALTER TABLE forum_posts ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns WHERE table_name='forum_posts' AND column_name='is_locked'
	) THEN
		ALTER TABLE forum_posts ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
	END IF;
END $$;

CREATE TABLE IF NOT EXISTS forum_replies (
	id SERIAL PRIMARY KEY,
	post_id INTEGER REFERENCES forum_posts(id) ON DELETE CASCADE,
	user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
	body TEXT NOT NULL,
	is_deleted BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
	id SERIAL PRIMARY KEY,
	user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
	username_snapshot TEXT,
	message TEXT NOT NULL,
	is_hidden BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session table for connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
	sid varchar NOT NULL COLLATE "default",
	sess json NOT NULL,
	expire timestamp(6) NOT NULL
) WITH (OIDS=FALSE);

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
	) THEN
		ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
	END IF;
END $$;
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Seed categories
INSERT INTO categories (name, slug)
SELECT * FROM (VALUES
	('Government', 'government'),
	('Education', 'education'),
	('Health', 'health'),
	('Business', 'business'),
	('Legal', 'legal')
) AS v(name, slug)
WHERE NOT EXISTS (SELECT 1 FROM categories);

-- Create default admin if none
DO $$
DECLARE needs_display_name BOOLEAN;
BEGIN
	SELECT EXISTS(
		SELECT 1 FROM information_schema.columns
		WHERE table_name='users' AND column_name='display_name' AND is_nullable='NO' AND column_default IS NULL
	) INTO needs_display_name;

	IF NOT EXISTS (SELECT 1 FROM users WHERE is_admin = TRUE) THEN
		IF needs_display_name THEN
			EXECUTE 'INSERT INTO users (username, email, password_hash, is_admin, display_name) VALUES ($1,$2,$3,TRUE,$4) ON CONFLICT DO NOTHING'
			USING 'admin', 'admin@aletheiadocs.local', '$2b$10$Z9zvP1o7gVt1z3m9aJmBguNQF8rTQkGcdH1H8C3kI0iK6kqT1uQG6', 'Admin';
		ELSE
			INSERT INTO users (username, email, password_hash, is_admin)
			VALUES ('admin', 'admin@aletheiadocs.local', '$2b$10$Z9zvP1o7gVt1z3m9aJmBguNQF8rTQkGcdH1H8C3kI0iK6kqT1uQG6', TRUE)
			ON CONFLICT DO NOTHING;
		END IF;
	END IF;
END $$;

-- Welcome announcement
DO $$
DECLARE has_text_col BOOLEAN;
BEGIN
	SELECT EXISTS(
		SELECT 1 FROM information_schema.columns
		WHERE table_name='announcements' AND column_name='text'
	) INTO has_text_col;

	IF NOT EXISTS (SELECT 1 FROM announcements) THEN
		IF has_text_col THEN
			EXECUTE 'INSERT INTO announcements (title, body, icon, text) VALUES ($1,$2,$3,$4)'
			USING 'Maligayang pagdating sa AletheiaDocs', 'Makabagong dokumento at mga kasangkapan para sa bawat Pilipino.', '☀️', 'Maligayang pagdating sa AletheiaDocs';
		ELSE
			INSERT INTO announcements (title, body, icon)
			VALUES ('Maligayang pagdating sa AletheiaDocs', 'Makabagong dokumento at mga kasangkapan para sa bawat Pilipino.', '☀️');
		END IF;
	END IF;
END $$;