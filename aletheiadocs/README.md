# AletheiaDocs

A professional Filipino website for documents, tools, forum, and chat.

## Features
- Document Center: upload, categories, search, one-click PDF view/download
- Built-in Tools: Philippines map (Leaflet + OSM), Live weather (OpenWeather)
- User Interaction: real-time chat (Socket.IO), forum posts and replies
- Admin Panel: manage announcements, moderate chat and forum
- Mobile-first, Filipino-inspired design

## Tech Stack
- Node.js + Express
- PostgreSQL (Railway)
- EJS + ejs-mate, vanilla JS, Leaflet, Socket.IO

## Getting Started

1. Clone and install:
```bash
npm install
```

2. Configure environment variables. Copy `.env.example` to `.env` and set values:
```env
PORT=3000
NODE_ENV=production
SESSION_SECRET=replace_me
DATABASE_PUBLIC_URL=postgresql://... # Railway provided
OPENWEATHER_API_KEY=your_openweather_key
```

3. Initialize the database schema:
```bash
npm run db:init
```

4. Start the server:
```bash
npm start
```

Visit `http://localhost:3000`.

Default admin (created on first init):
- email: admin@aletheiadocs.local
- password: admin123

## Railway Deployment

1. Create a new Railway project.
2. Add a PostgreSQL database plugin or use your existing database.
3. Set environment variables in Railway Settings → Variables:
   - `PORT=3000`
   - `NODE_ENV=production`
   - `SESSION_SECRET=your_random_secret`
   - `DATABASE_PUBLIC_URL=postgresql://...` (your Railway DB URL)
   - `OPENWEATHER_API_KEY=your_openweather_key`
4. Deploy. Railway will run `web: node server.js` from `Procfile`.
5. Run the migration once (from the Railway Shell):
```bash
npm run db:init
```

## Notes
- Uploads are stored on the instance filesystem under `/uploads`. For scale-out setups, prefer object storage (S3-compatible) and update `routes/documents.js` accordingly.
- SSL for PostgreSQL is auto-enabled when `DATABASE_PUBLIC_URL` includes "railway".

## License
MIT